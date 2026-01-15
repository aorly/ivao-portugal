"use client";

import { useEffect, useMemo, useState } from "react";

type LoadingStep = {
  id: string;
  label: string;
  weight: number;
};

type Props = {
  title: string;
  subtitle?: string;
  steps: LoadingStep[];
  durationMs?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function LoadingPanel({ title, subtitle, steps, durationMs = 1800 }: Props) {
  const [progress, setProgress] = useState(4);
  const [activeIndex, setActiveIndex] = useState(0);
  const totalWeight = useMemo(() => steps.reduce((acc, step) => acc + step.weight, 0), [steps]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = clamp((elapsed / durationMs) * 100, 4, 96);
      setProgress(nextProgress);

      const threshold = (nextProgress / 100) * totalWeight;
      let cumulative = 0;
      let nextIndex = 0;
      for (let i = 0; i < steps.length; i += 1) {
        cumulative += steps[i].weight;
        if (threshold >= cumulative) {
          nextIndex = i + 1;
        }
      }
      setActiveIndex(clamp(nextIndex, 0, steps.length - 1));
    }, 120);

    return () => clearInterval(timer);
  }, [durationMs, steps, totalWeight]);

  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">Loading</p>
        <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{title}</p>
        {subtitle ? <p className="text-sm text-[color:var(--text-muted)]">{subtitle}</p> : null}
      </div>
      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[color:var(--primary)] transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-5 grid gap-3 text-sm text-[color:var(--text-muted)]">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          return (
            <div key={step.id} className="flex items-center gap-3">
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                  isDone
                    ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white"
                    : isActive
                      ? "border-[color:var(--primary)] text-[color:var(--primary)]"
                      : "border-[color:var(--border)] text-[color:var(--text-muted)]",
                ].join(" ")}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span className={isActive ? "text-[color:var(--text-primary)]" : undefined}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
