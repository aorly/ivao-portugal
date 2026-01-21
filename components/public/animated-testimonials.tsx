"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";

type Testimonial = {
  id: string;
  name: string;
  role?: string | null;
  content: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
};

type Props = {
  testimonials: Testimonial[];
};

export function AnimatedTestimonials({ testimonials }: Props) {
  const items = useMemo(() => testimonials, [testimonials]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const handle = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(handle);
  }, [items.length]);

  if (items.length === 0) return null;
  const active = items[index];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <Card className="relative overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(44,107,216,0.12),transparent_45%)]" />
        <div className="relative space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Testimonials</p>
            <p className="text-2xl font-semibold text-[color:var(--text-primary)]">Voices from the community</p>
          </div>
          <div className="space-y-4">
            <p className="text-lg text-[color:var(--text-primary)] leading-relaxed">
              &ldquo;{active.content}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <UserAvatar
                name={active.name}
                src={active.avatarUrl}
                colorKey={active.avatarColor}
                size={48}
                className="rounded-2xl text-sm font-semibold"
              />
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{active.name}</p>
                <p className="text-xs text-[color:var(--text-muted)]">{active.role ?? "Member"}</p>
              </div>
            </div>
          </div>
          {items.length > 1 ? (
            <div className="flex items-center gap-2">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(idx)}
                  className={`h-2 w-2 rounded-full transition ${
                    idx === index ? "bg-[color:var(--primary)]" : "bg-[color:var(--surface-3)]"
                  }`}
                  aria-label={`View testimonial ${idx + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </Card>
      <div className="grid gap-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition ${
              idx === index ? "shadow-[var(--shadow-soft)]" : "opacity-60"
            }`}
          >
            <p className="text-sm text-[color:var(--text-primary)] line-clamp-3">
              &ldquo;{item.content}&rdquo;
            </p>
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              {item.name} • {item.role ?? "Member"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
