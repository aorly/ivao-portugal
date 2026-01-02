import { prisma } from "@/lib/prisma";

type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

export async function logAudit({ actorId, action, entityType, entityId, before, after }: AuditEntry) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId: entityId ?? null,
      before: before !== undefined ? JSON.stringify(before) : null,
      after: after !== undefined ? JSON.stringify(after) : null,
    },
  });
}
