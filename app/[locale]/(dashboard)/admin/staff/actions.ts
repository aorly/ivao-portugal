"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";
import { logAudit } from "@/lib/audit";
import { revalidateTag } from "next/cache";
import { ivaoClient } from "@/lib/ivaoClient";
import { getSiteConfig } from "@/lib/site-config";

const ensureStaffAdmin = async () => {
  const ok = await requireStaffPermission("admin:staff");
  if (!ok) throw new Error("Unauthorized");
  return auth();
};

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object") {
    const obj = value as { data?: unknown; result?: unknown; items?: unknown };
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.result)) return obj.result as Record<string, unknown>[];
    if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
  }
  return [];
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

type SyncStaffState = {
  success?: boolean;
  error?: string;
  errorDetail?: string;
  createdDepartments?: number;
  createdTeams?: number;
  createdPositions?: number;
  createdAssignments?: number;
  updatedAssignments?: number;
  deactivatedAssignments?: number;
  totalItems?: number;
};

export async function syncStaffFromIvao(_prevState: SyncStaffState, _formData: FormData): Promise<SyncStaffState> {
  void _prevState;
  void _formData;
  const session = await ensureStaffAdmin();
  const result = await syncStaffFromIvaoInternal(session?.user?.id ?? null);
  revalidateTag("staff-admin");
  return result;
}

export async function syncStaffFromIvaoInternal(actorId: string | null): Promise<SyncStaffState> {
  const siteConfig = await getSiteConfig();
  const divisionId = siteConfig.divisionId?.toUpperCase() ?? "PT";

  const items: Record<string, unknown>[] = [];
  let lastErrorMessage: string | null = null;
  let lastPayloadSnippet: string | null = null;

  const fetchPages = async (isVacant?: boolean) => {
    let page = 1;
    let pages = 1;
    while (page <= pages) {
      const payload = await ivaoClient.getUserStaffPositions(divisionId, page, {
        isVacant,
      });
      if (!payload || typeof payload !== "object") break;
      if ("error" in payload || "message" in payload) {
        const errorMsg =
          String((payload as { error?: unknown }).error ?? "") ||
          String((payload as { message?: unknown }).message ?? "");
        if (errorMsg) lastErrorMessage = errorMsg;
      }
      if (!lastPayloadSnippet) {
        try {
          lastPayloadSnippet = JSON.stringify(payload).slice(0, 500);
        } catch {
          lastPayloadSnippet = null;
        }
      }
      const itemsPayload =
        (payload as { items?: unknown }).items ??
        (payload as { data?: { items?: unknown } }).data?.items ??
        (payload as { result?: { items?: unknown } }).result?.items ??
        payload;
      const batch = asArray(itemsPayload);
      items.push(...batch);
      pages = Number((payload as { pages?: unknown }).pages ?? 1);
      page += 1;
    }
  };

  await fetchPages(false);
  await fetchPages(true);

  if (items.length === 0) {
    return {
      success: false,
      error: lastErrorMessage ? `IVAO error: ${lastErrorMessage}` : "No staff positions returned from IVAO.",
      errorDetail: lastPayloadSnippet ?? undefined,
    };
  }

  const departmentMap = new Map<string, { name: string; description: string | null; createdAt: Date | null; updatedAt: Date | null }>();
  const teamMap = new Map<string, { name: string; description: string | null; departmentId: string | null; createdAt: Date | null; updatedAt: Date | null }>();
  const positionMap = new Map<string, { name: string; type: string | null; order: number | null; description: string | null; teamId: string | null; createdAt: Date | null; updatedAt: Date | null }>();

  const assignments = items
    .map((item) => {
      const assignmentId = String(item.id ?? "").trim();
      const userVid = String(item.userId ?? item.user_id ?? "").trim();
      const connectAs = String(item.connectAs ?? item.connect_as ?? assignmentId).trim();
      if (!assignmentId || !userVid) return null;

      const positionData = (item.staffPosition as Record<string, unknown>) ?? {};
      const teamData = (positionData.departmentTeam as Record<string, unknown>) ?? {};
      const departmentData = (teamData.department as Record<string, unknown>) ?? {};

      const departmentId = String(departmentData.id ?? "").trim();
      const teamId = String(teamData.id ?? "").trim();
      const positionId = String(positionData.id ?? "").trim();
      if (!positionId) return null;

      const departmentName = String(departmentData.name ?? teamData.name ?? "Department").trim();
      const departmentDesc = String(departmentData.description ?? "").trim() || null;
      const teamName = String(teamData.name ?? "Team").trim();
      const teamDesc = String(teamData.description ?? "").trim() || null;
      const positionName = String(positionData.name ?? connectAs).trim() || connectAs;
      const positionDesc = String(positionData.description ?? "").trim() || null;
      const positionType = String(positionData.type ?? "").trim() || null;
      const positionOrder = typeof positionData.order === "number" ? positionData.order : null;

      if (departmentId) {
        departmentMap.set(departmentId, {
          name: departmentName,
          description: departmentDesc,
          createdAt: parseDate(departmentData.createdAt),
          updatedAt: parseDate(departmentData.updatedAt),
        });
      }

      if (teamId) {
        teamMap.set(teamId, {
          name: teamName,
          description: teamDesc,
          departmentId: departmentId || null,
          createdAt: parseDate(teamData.createdAt),
          updatedAt: parseDate(teamData.updatedAt),
        });
      }

      positionMap.set(positionId, {
        name: positionName,
        description: positionDesc,
        type: positionType,
        order: positionOrder,
        teamId: teamId || null,
        createdAt: parseDate(positionData.createdAt),
        updatedAt: parseDate(positionData.updatedAt),
      });

      return {
        id: assignmentId,
        userVid,
        divisionId: String(item.divisionId ?? divisionId).trim() || divisionId,
        centerId: item.centerId ? String(item.centerId) : null,
        connectAs,
        onTrial: Boolean(item.onTrial),
        description: item.description ? String(item.description) : null,
        remarks: item.remarks ? String(item.remarks) : null,
        positionId,
        ivaoCreatedAt: parseDate(item.createdAt),
        ivaoUpdatedAt: parseDate(item.updatedAt),
      };
    })
    .filter(Boolean) as {
      id: string;
      userVid: string;
      divisionId: string;
      centerId: string | null;
      connectAs: string;
      onTrial: boolean;
      description: string | null;
      remarks: string | null;
      positionId: string;
      ivaoCreatedAt: Date | null;
      ivaoUpdatedAt: Date | null;
    }[];

  let createdDepartments = 0;
  for (const [id, dept] of departmentMap.entries()) {
    const existing = await prisma.ivaoDepartment.findUnique({ where: { id } });
    if (!existing) {
      await prisma.ivaoDepartment.create({
        data: {
          id,
          name: dept.name,
          description: dept.description,
          ivaoCreatedAt: dept.createdAt,
          ivaoUpdatedAt: dept.updatedAt,
        },
      });
      createdDepartments += 1;
    } else if (existing.name !== dept.name || (existing.description ?? null) !== (dept.description ?? null)) {
      await prisma.ivaoDepartment.update({
        where: { id },
        data: {
          name: dept.name,
          description: dept.description,
          ivaoUpdatedAt: dept.updatedAt ?? existing.ivaoUpdatedAt,
        },
      });
    }
  }

  let createdTeams = 0;
  for (const [id, team] of teamMap.entries()) {
    const existing = await prisma.ivaoDepartmentTeam.findUnique({ where: { id } });
    if (!existing) {
      await prisma.ivaoDepartmentTeam.create({
        data: {
          id,
          name: team.name,
          description: team.description,
          departmentId: team.departmentId,
          ivaoCreatedAt: team.createdAt,
          ivaoUpdatedAt: team.updatedAt,
        },
      });
      createdTeams += 1;
    } else if (
      existing.name !== team.name ||
      (existing.description ?? null) !== (team.description ?? null) ||
      existing.departmentId !== team.departmentId
    ) {
      await prisma.ivaoDepartmentTeam.update({
        where: { id },
        data: {
          name: team.name,
          description: team.description,
          departmentId: team.departmentId,
          ivaoUpdatedAt: team.updatedAt ?? existing.ivaoUpdatedAt,
        },
      });
    }
  }

  let createdPositions = 0;
  for (const [id, pos] of positionMap.entries()) {
    const existing = await prisma.ivaoStaffPosition.findUnique({ where: { id } });
    if (!existing) {
      await prisma.ivaoStaffPosition.create({
        data: {
          id,
          name: pos.name,
          description: pos.description,
          type: pos.type,
          order: pos.order,
          teamId: pos.teamId,
          ivaoCreatedAt: pos.createdAt,
          ivaoUpdatedAt: pos.updatedAt,
        },
      });
      createdPositions += 1;
    } else if (
      existing.name !== pos.name ||
      (existing.description ?? null) !== (pos.description ?? null) ||
      existing.type !== pos.type ||
      existing.order !== pos.order ||
      existing.teamId !== pos.teamId
    ) {
      await prisma.ivaoStaffPosition.update({
        where: { id },
        data: {
          name: pos.name,
          description: pos.description,
          type: pos.type,
          order: pos.order,
          teamId: pos.teamId,
          ivaoUpdatedAt: pos.updatedAt ?? existing.ivaoUpdatedAt,
        },
      });
    }
  }

  const vids = Array.from(new Set(assignments.map((assignment) => assignment.userVid)));
  const users = await prisma.user.findMany({ where: { vid: { in: vids } }, select: { id: true, vid: true } });
  const userIdByVid = new Map(users.map((user) => [user.vid, user.id]));

  const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
  const existingAssignments = await prisma.ivaoStaffAssignment.findMany({
    where: { divisionId },
    select: { id: true, userId: true, userVid: true, active: true },
  });

  let createdAssignments = 0;
  let updatedAssignments = 0;

  for (const assignment of assignments) {
    const userId = userIdByVid.get(assignment.userVid) ?? null;
    const existing = await prisma.ivaoStaffAssignment.findUnique({ where: { id: assignment.id } });
    if (!existing) {
      await prisma.ivaoStaffAssignment.create({
        data: {
          id: assignment.id,
          userVid: assignment.userVid,
          userId,
          divisionId: assignment.divisionId,
          centerId: assignment.centerId,
          connectAs: assignment.connectAs,
          onTrial: assignment.onTrial,
          description: assignment.description,
          remarks: assignment.remarks,
          positionId: assignment.positionId,
          active: true,
          ivaoCreatedAt: assignment.ivaoCreatedAt,
          ivaoUpdatedAt: assignment.ivaoUpdatedAt,
        },
      });
      createdAssignments += 1;
    } else {
      await prisma.ivaoStaffAssignment.update({
        where: { id: assignment.id },
        data: {
          userVid: assignment.userVid,
          userId,
          divisionId: assignment.divisionId,
          centerId: assignment.centerId,
          connectAs: assignment.connectAs,
          onTrial: assignment.onTrial,
          description: assignment.description,
          remarks: assignment.remarks,
          positionId: assignment.positionId,
          active: true,
          ivaoUpdatedAt: assignment.ivaoUpdatedAt ?? existing.ivaoUpdatedAt,
        },
      });
      updatedAssignments += 1;
    }
  }

  let deactivatedAssignments = 0;
  for (const assignment of existingAssignments) {
    if (!assignmentIds.has(assignment.id) && assignment.active) {
      await prisma.ivaoStaffAssignment.update({
        where: { id: assignment.id },
        data: { active: false },
      });
      deactivatedAssignments += 1;
    }
  }

  if (actorId) {
    await logAudit({
      actorId,
      action: "sync-ivao",
      entityType: "staff",
      entityId: null,
      before: null,
      after: {
        totalItems: items.length,
        createdDepartments,
        createdTeams,
        createdPositions,
        createdAssignments,
        updatedAssignments,
        deactivatedAssignments,
      },
    });
  }

  return {
    success: true,
    createdDepartments,
    createdTeams,
    createdPositions,
    createdAssignments,
    updatedAssignments,
    deactivatedAssignments,
    totalItems: items.length,
  };
}
