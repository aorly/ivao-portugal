"use client";

import { useEffect, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  query: string;
  range: "all" | "future" | "history";
};

export function EventsFilters({ query, range }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchId = useId();
  const [searchValue, setSearchValue] = useState(query);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

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

  const rangeValue = range === "history" ? "history" : range === "future" ? "future" : "all";
  const isFutureActive = rangeValue !== "history";
  const isHistoryActive = rangeValue === "history";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-xs text-[color:var(--text-muted)]">
          <button
            type="button"
            onClick={() => updateParam("range", "future")}
            className={[
              "rounded-xl px-4 py-2 transition",
              isFutureActive
                ? "bg-[color:var(--surface-2)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]",
            ].join(" ")}
          >
            Future
          </button>
          <button
            type="button"
            onClick={() => updateParam("range", "history")}
            className={[
              "rounded-xl px-4 py-2 transition",
              isHistoryActive
                ? "bg-[color:var(--surface-2)] text-[color:var(--text-primary)] shadow-sm"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]",
            ].join(" ")}
          >
            History
          </button>
        </div>

        <div className="flex w-full min-w-0 flex-1 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text-muted)] sm:min-w-[240px] lg:max-w-[649px]">
          <label htmlFor={searchId} className="sr-only">
            Search events
          </label>
          <input
            id={searchId}
            type="search"
            value={searchValue}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchValue(nextValue);
              updateParam("q", nextValue.trim());
            }}
            placeholder="Search for name, airport or date"
            className="w-full bg-transparent text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus-visible:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
