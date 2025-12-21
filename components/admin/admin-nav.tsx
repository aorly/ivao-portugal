'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { adminDetailRoutes, adminNavSections } from "@/lib/admin-nav";

type Props = {
  locale: string;
};

export function AdminNav({ locale }: Props) {
  const pathname = usePathname();

  return (
    <Card className="space-y-2 p-3 md:p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">Admin</p>
        <p className="text-[10px] text-[color:var(--text-muted)]">/{locale}/*</p>
      </div>

      <div className="flex w-full flex-wrap gap-2">
        {adminNavSections.map((section) => (
          <div
            key={section.title}
            className="flex min-w-[220px] flex-1 flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2"
          >
            <p className="text-xs font-semibold text-[color:var(--text-primary)]">{section.title}</p>
            <div className="flex flex-wrap gap-2">
              {section.items.map((item) => {
                const href = `/${locale}${item.href}`;
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]",
                      isActive && "border-[color:var(--primary)] text-[color:var(--primary)]",
                    )}
                    title={item.description}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-[color:var(--text-muted)]">
        {adminDetailRoutes.map((route) => (
          <span
            key={route.path}
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1"
            title={route.description}
          >
            /{locale}
            {route.path}
          </span>
        ))}
      </div>
    </Card>
  );
}
