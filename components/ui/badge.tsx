import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "info" | "success" | "warning";
};

const toneStyles: Record<Required<BadgeProps>["tone"], string> = {
  info: "bg-[color:var(--surface-3)] text-[color:var(--primary)]",
  success: "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
};

export function Badge({ className, tone = "info", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
