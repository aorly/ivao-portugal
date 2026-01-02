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
        <div className="flex items-center rounded-2xl border border-[#2B3860] bg-[#131B36] p-1 text-xs text-white/70">
          <button
            type="button"
            onClick={() => updateParam("range", "future")}
            className={[
              "rounded-xl px-4 py-2 transition",
              isFutureActive
                ? "bg-[#202C51] text-white shadow-sm"
                : "text-white/60 hover:text-white",
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
                ? "bg-[#202C51] text-white shadow-sm"
                : "text-white/60 hover:text-white",
            ].join(" ")}
          >
            History
          </button>
        </div>

        <div className="flex w-full min-w-[240px] flex-1 items-center rounded-2xl border border-[#2B3860] bg-[#131B36] px-5 py-3 text-sm text-white/70 lg:max-w-[649px]">
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
            className="w-full bg-transparent text-sm text-white placeholder:text-white/60 focus-visible:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
