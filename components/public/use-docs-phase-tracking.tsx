"use client";

import { useEffect, useMemo, useState } from "react";

type PhaseItem = {
  id: string;
  title: string;
};

type Options = {
  storageKey?: string;
};

export function useDocsPhaseTracking(items: PhaseItem[], options: Options = {}) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [progress, setProgress] = useState(0);

  const validItems = useMemo(() => items.filter((item) => item.id && item.title), [items]);

  useEffect(() => {
    if (validItems.length === 0) return;

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      setProgress(next);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const sections = validItems
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (sections.length === 0) {
      return () => window.removeEventListener("scroll", onScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => (a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1));
        const nextId = visible[0]?.target?.id ?? "";
        if (!nextId) return;
        setActive(nextId);
        if (options.storageKey) {
          window.localStorage.setItem(options.storageKey, nextId);
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: [0.1, 0.4, 0.8] },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [validItems, options.storageKey]);

  return { active, progress, validItems };
}
