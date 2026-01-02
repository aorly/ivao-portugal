import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { AuditLogsList } from "@/components/admin/audit-logs-list";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{
    action?: string;
    entity?: string;
    user?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
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
  const userFilter = sp.user ? String(sp.user).trim() : "";
  const fromFilter = sp.from ? String(sp.from).trim() : "";
  const toFilter = sp.to ? String(sp.to).trim() : "";
  const page = 1;
  const take = 16;
  const limit = 15;
  const offset = (page - 1) * limit;
  const fromDate = fromFilter ? new Date(fromFilter) : null;
  const toDate = toFilter ? new Date(toFilter) : null;
  const createdAtFilter =
    (fromDate && !Number.isNaN(fromDate.valueOf())) || (toDate && !Number.isNaN(toDate.valueOf()))
      ? {
          createdAt: {
            ...(fromDate && !Number.isNaN(fromDate.valueOf()) ? { gte: fromDate } : {}),
            ...(toDate && !Number.isNaN(toDate.valueOf()) ? { lte: toDate } : {}),
          },
        }
      : {};
  const userQuery = userFilter
    ? {
        OR: [
          { actorId: userFilter },
          { actor: { name: { contains: userFilter, mode: "insensitive" } } },
          { actor: { vid: { contains: userFilter, mode: "insensitive" } } },
        ],
      }
    : {};

  const logs = await prisma.auditLog.findMany({
    where: {
      action: actionFilter ? actionFilter : undefined,
      entityType: entityFilter ? entityFilter : undefined,
      ...createdAtFilter,
      ...userQuery,
    },
    include: { actor: { select: { name: true, vid: true } } },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take,
  });
  const hasMore = logs.length > limit;
  const visibleLogs = hasMore ? logs.slice(0, limit) : logs;
  const actions = Array.from(new Set(visibleLogs.map((log) => log.action))).sort();
  const entities = Array.from(new Set(visibleLogs.map((log) => log.entityType))).sort();
  const initialLogs = visibleLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    createdAt: log.createdAt.toISOString(),
    actorId: log.actorId,
    actorName: log.actor?.name ?? null,
    actorVid: log.actor?.vid ?? null,
  }));

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Audit logs</p>
            <p className="text-sm text-[color:var(--text-muted)]">
              Track staff changes across departments, positions, menus, and user access.
            </p>
          </div>
          <form
            action="/api/admin/audit-logs/export"
            method="get"
            className="flex items-center gap-2"
          >
            <input type="hidden" name="action" value={actionFilter} />
            <input type="hidden" name="entity" value={entityFilter} />
            <input type="hidden" name="user" value={userFilter} />
            <input type="hidden" name="from" value={fromFilter} />
            <input type="hidden" name="to" value={toFilter} />
            <Button type="submit" size="sm" variant="secondary">
              Export JSON
            </Button>
          </form>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <form className="flex flex-wrap gap-2 text-sm">
          <input
            name="user"
            placeholder="User (name, VID, ID)"
            defaultValue={userFilter}
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
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
          <input
            type="datetime-local"
            name="from"
            defaultValue={fromFilter}
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            type="datetime-local"
            name="to"
            defaultValue={toFilter}
            className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <button
            type="submit"
            className="rounded-md bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white"
          >
            Filter
          </button>
        </form>
      </Card>

      <Card className="space-y-3 p-4">
        <AuditLogsList
          locale={locale}
          initialLogs={initialLogs}
          initialHasMore={hasMore}
          filters={{
            action: actionFilter,
            entity: entityFilter,
            user: userFilter,
            from: fromFilter,
            to: toFilter,
          }}
        />
      </Card>
    </main>
  );
}
