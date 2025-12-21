"use client";

import { useEffect } from "react";

type Props = {
  intervalMs?: number;
};

export function AutoRefresh({ intervalMs = 60_000 }: Props) {
  useEffect(() => {
    const id = setInterval(() => {
      window.location.reload();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return null;
}
