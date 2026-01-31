"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type React from "react";

type PracticeModeContextValue = {
  enabled: boolean;
  toggle: () => void;
};

const PracticeModeContext = createContext<PracticeModeContextValue | null>(null);

export function PracticeModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("docs:practice-mode") === "true";
  });

  useEffect(() => {
    window.localStorage.setItem("docs:practice-mode", enabled ? "true" : "false");
    document.documentElement.dataset.practiceMode = enabled ? "true" : "false";
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled,
      toggle: () => setEnabled((prev) => !prev),
    }),
    [enabled],
  );

  return <PracticeModeContext.Provider value={value}>{children}</PracticeModeContext.Provider>;
}

export function usePracticeMode() {
  const context = useContext(PracticeModeContext);
  if (!context) {
    return { enabled: false, toggle: () => {} };
  }
  return context;
}

export function PracticeModeToggle() {
  const { enabled, toggle } = usePracticeMode();
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
    >
      {enabled ? "Practice mode on" : "Practice mode off"}
    </button>
  );
}
