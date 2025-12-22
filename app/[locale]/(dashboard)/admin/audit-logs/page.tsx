import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ action?: string; entity?: string }>;
};

export default async function AuditLogsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:audit");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  const sp = (await searchParams) ?? {};
  const actionFilter = sp.action ? String(sp.action).trim() : "";
  const entityFilter = sp.entity ? String(sp.entity).trim() : "";

  const logs = await prisma.auditLog.findMany({
    where: {
      action: actionFilter ? actionFilter : undefined,
      entityType: entityFilter ? entityFilter : undefined,
    },
    include: { actor: { select: { name: true, vid: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const actions = Array.from(new Set(logs.map((log) => log.action))).sort();
  const entities = Array.from(new Set(logs.map((log) => log.entityType))).sort();

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Audit logs</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Track staff changes across departments, positions, menus, and user access.
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <form className="flex flex-wrap gap-2 text-sm">
          <select
            name="action"
            defaultValue={actionFilter}
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
          <select
            name="entity"
            defaultValue={entityFilter}
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="">All entities</option>
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white"
          >
            Filter
          </button>
        </form>
      </Card>

      <Card className="space-y-3 p-4">
        {logs.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No logs recorded yet.</p>
        ) : (
          <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {log.action} {log.entityType}
                  </p>
                  <span className="text-xs text-[color:var(--text-muted)]">
                    {log.createdAt.toLocaleString(locale)}
                  </span>
                </div>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Actor: {log.actor?.name ?? log.actor?.vid ?? log.actorId ?? "System"}
                </p>
                {log.entityId ? (
                  <p className="text-xs text-[color:var(--text-muted)]">Entity ID: {log.entityId}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
