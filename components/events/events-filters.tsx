"use client";

import { useId, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Option = { value: string; label: string };

type Props = {
  regions: Option[];
  firs: string[];
  divisions: string[];
  types: string[];
  totalCount: number;
  filteredCount: number;
  selected: {
    region: string;
    fir: string;
    division: string;
    type: string;
  };
};

export function EventsFilters({ regions, firs, divisions, types, selected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const regionId = useId();
  const firId = useId();
  const divisionId = useId();
  const typeId = useId();

  const regionOptions = useMemo(() => [{ value: "all", label: "All regions" }, ...regions], [regions]);
  const firOptions = useMemo(() => ["all", ...firs], [firs]);
  const divisionOptions = useMemo(() => ["all", ...divisions], [divisions]);
  const typeOptions = useMemo(() => ["all", ...types], [types]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    const pathname = window.location.pathname;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    router.replace(window.location.pathname, { scroll: false });
  };

  const activeFilters = [
    selected.region !== "all" ? { key: "region", label: `Region: ${selected.region}` } : null,
    selected.fir !== "all" ? { key: "fir", label: `FIR: ${selected.fir}` } : null,
    selected.division !== "all" ? { key: "division", label: `Division: ${selected.division}` } : null,
    selected.type !== "all" ? { key: "type", label: `Type: ${selected.type}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor={regionId} className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Region
          </label>
          <select
            id={regionId}
            value={selected.region}
            onChange={(e) => updateParam("region", e.target.value)}
            className="min-w-[180px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
          >
            {regionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={firId} className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            FIR
          </label>
          <select
            id={firId}
            value={selected.fir}
            onChange={(e) => updateParam("fir", e.target.value)}
            className="min-w-[180px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
          >
            {firOptions.map((fir) => (
              <option key={fir} value={fir}>
                {fir === "all" ? "All FIRs" : fir}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={divisionId} className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Division
          </label>
          <select
            id={divisionId}
            value={selected.division}
            onChange={(e) => updateParam("division", e.target.value)}
            className="min-w-[180px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
          >
            {divisionOptions.map((division) => (
              <option key={division} value={division}>
                {division === "all" ? "All divisions" : division}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={typeId} className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Type
          </label>
          <select
            id={typeId}
            value={selected.type}
            onChange={(e) => updateParam("type", e.target.value)}
            className="min-w-[180px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] px-3 py-2 text-sm text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "All types" : type}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-end">
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
        <span role="status" aria-live="polite">
          Showing {filteredCount} of {totalCount}
        </span>
        {activeFilters.length > 0 ? <span className="text-[color:var(--border)]">|</span> : null}
        {activeFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => updateParam(filter.key, "all")}
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-1)] px-2 py-1 text-[11px] text-[color:var(--text-muted)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
