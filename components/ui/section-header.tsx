import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ eyebrow, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-2">
        {eyebrow ? <Badge>{eyebrow}</Badge> : null}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">{title}</h2>
          {description ? (
            <p className="max-w-2xl text-sm text-[color:var(--text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
