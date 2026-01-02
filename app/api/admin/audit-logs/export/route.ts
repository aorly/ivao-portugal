import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await requireStaffPermission("admin:audit");
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = (searchParams.get("action") ?? "").trim();
  const entity = (searchParams.get("entity") ?? "").trim();
  const user = (searchParams.get("user") ?? "").trim();
  const from = (searchParams.get("from") ?? "").trim();
  const to = (searchParams.get("to") ?? "").trim();
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const createdAtFilter =
    (fromDate && !Number.isNaN(fromDate.valueOf())) || (toDate && !Number.isNaN(toDate.valueOf()))
      ? {
          createdAt: {
            ...(fromDate && !Number.isNaN(fromDate.valueOf()) ? { gte: fromDate } : {}),
            ...(toDate && !Number.isNaN(toDate.valueOf()) ? { lte: toDate } : {}),
          },
        }
      : {};
  const userQuery = user
    ? {
        OR: [
          { actorId: user },
          { actor: { name: { contains: user, mode: "insensitive" } } },
          { actor: { vid: { contains: user, mode: "insensitive" } } },
        ],
      }
    : {};

  const logs = await prisma.auditLog.findMany({
    where: {
      action: action ? action : undefined,
      entityType: entity ? entity : undefined,
      ...createdAtFilter,
      ...userQuery,
    },
    include: { actor: { select: { name: true, vid: true } } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const payload = logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    createdAt: log.createdAt,
    actorId: log.actorId,
    actorName: log.actor?.name ?? null,
    actorVid: log.actor?.vid ?? null,
    before: log.before,
    after: log.after,
  }));

  const fileName = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
    },
  });
}
