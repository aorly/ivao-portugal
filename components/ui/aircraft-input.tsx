"use client";

import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";
import { cn } from "@/lib/utils";

type AircraftRuleFieldProps = {
  valueName: string;
  allowAnyName: string;
  defaultValue?: string;
  defaultAllowAny?: boolean;
  placeholder?: string;
  className?: string;
};

const normalizeAircraftList = (value: string) => {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9,\s/]+/g, " ")
    .replace(/[\/]+/g, " ");
  const tokens = cleaned.split(/[\s,]+/).filter(Boolean);
  return tokens.join(", ");
};

export function AircraftRuleField({
  valueName,
  allowAnyName,
  defaultValue,
  defaultAllowAny = false,
  placeholder,
  className,
}: AircraftRuleFieldProps) {
  const initialValue = defaultAllowAny ? "" : defaultValue ?? "";
  const [value, setValue] = useState(initialValue);
  const allowAny = (value ?? "").trim() === "";

  const handleBlur = useCallback(() => {
    const normalized = normalizeAircraftList(value);
    if (normalized !== value) {
      setValue(normalized);
    }
  }, [value]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const handleAllowAnyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        setValue("");
      }
    },
    [],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <input
        name={valueName}
        value={value}
        placeholder={placeholder}
        onBlur={handleBlur}
        onChange={handleChange}
        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-muted)]">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            name={allowAnyName}
            checked={allowAny}
            onChange={handleAllowAnyChange}
            className="h-4 w-4"
          />
          Allow any aircraft (ignore list)
        </label>
        <span>Auto-formats on blur.</span>
      </div>
      <p className="text-xs text-[color:var(--text-muted)]">If the list is empty, all aircraft are allowed by default. Uncheck to enforce the list.</p>
    </div>
  );
}
