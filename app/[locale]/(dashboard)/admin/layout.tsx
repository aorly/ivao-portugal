import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRole } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { type Locale } from "@/i18n";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
};

const adminLinks = [
  { slug: "", labelKey: "overview" },
  { slug: "events", labelKey: "events" },
  { slug: "airports", labelKey: "airports" },
  { slug: "firs", labelKey: "firs" },
  { slug: "training", labelKey: "training" },
];

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const session = await auth();

  const role = session?.user?.role ?? "USER";
  if (!session?.user || !["ADMIN", "STAFF"].includes(role)) {
    return (
      <main className="flex flex-col gap-6">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        <Card>
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <nav className="flex flex-wrap gap-2">
        {adminLinks.map((link) => {
          const href = `/${locale}/admin${link.slug ? `/${link.slug}` : ""}`;
          return (
            <Link
              key={link.slug || "overview"}
              className={cn(
                "rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--text-muted)] hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)]",
              )}
              href={href}
            >
              {t(link.labelKey)}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
