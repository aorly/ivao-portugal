"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  actorVid: string | null;
};

type Filters = {
  action: string;
  entity: string;
  user: string;
  from: string;
  to: string;
};

type Props = {
  locale: string;
  initialLogs: AuditLogItem[];
  initialHasMore: boolean;
  filters: Filters;
};

export function AuditLogsList({ locale, initialLogs, initialHasMore, filters }: Props) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(2);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    setLogs(initialLogs);
    setHasMore(initialHasMore);
    setIsLoading(false);
    setPage(2);
  }, [filtersKey, initialLogs, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.entity) params.set("entity", filters.entity);
    if (filters.user) params.set("user", filters.user);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("page", String(page));

    const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
    if (!response.ok) {
      setIsLoading(false);
      return;
    }
    const payload = (await response.json()) as { logs: AuditLogItem[]; hasMore: boolean; nextPage: number };
    setLogs((prev) => [...prev, ...payload.logs]);
    setHasMore(payload.hasMore);
    setPage(payload.nextPage);
    setIsLoading(false);
  }, [filters.action, filters.entity, filters.user, filters.from, filters.to, hasMore, isLoading, page]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  if (logs.length === 0) {
    return <p className="text-sm text-[color:var(--text-muted)]">No logs recorded yet.</p>;
  }

  return (
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
              {new Date(log.createdAt).toLocaleString(locale)}
            </span>
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">
            Actor: {log.actorName ?? log.actorVid ?? log.actorId ?? "System"}
          </p>
          {log.entityId ? <p className="text-xs text-[color:var(--text-muted)]">Entity ID: {log.entityId}</p> : null}
        </div>
      ))}
      {isLoading ? (
        <p className="text-xs text-[color:var(--text-muted)]">Loading more...</p>
      ) : (
        <div ref={sentinelRef} />
      )}
      {!hasMore ? <p className="text-xs text-[color:var(--text-muted)]">End of results.</p> : null}
    </div>
  );
}
