"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

const getTheme = (): Theme => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getTheme());

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ theme?: Theme }>).detail;
      setTheme(detail?.theme ?? getTheme());
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  const nextTheme = theme === "dark" ? "light" : "dark";

  const applyTheme = (value: Theme) => {
    document.documentElement.dataset.theme = value;
    localStorage.setItem("theme", value);
    setTheme(value);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: value } }));
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      aria-label={`Switch to ${nextTheme} theme`}
      onClick={() => applyTheme(nextTheme)}
      className="h-9 w-9 rounded-full p-0"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.95-6.95-2.12 2.12M9.17 14.83l-2.12 2.12m0-9.95 2.12 2.12m9.66 9.66-2.12-2.12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </Button>
  );
}
