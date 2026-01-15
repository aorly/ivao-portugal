"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const readTheme = (): Theme => {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
};

export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ theme?: Theme }>).detail;
      setTheme(detail?.theme ?? readTheme());
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);

  return theme;
}
