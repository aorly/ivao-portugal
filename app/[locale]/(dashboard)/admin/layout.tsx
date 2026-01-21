import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { getStaffPermissions, type StaffPermission } from "@/lib/staff";
import { getMenu } from "@/lib/menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const session = await auth();
  if (!session?.user) {
    const callbackUrl = `/${locale}/admin`;
    redirect(`/api/ivao/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const role = session?.user?.role ?? "USER";
  const staffPermissions = session?.user?.id
    ? await getStaffPermissions(session.user.id)
    : new Set<StaffPermission>();
  const hasStaffAccess = staffPermissions.size > 0;
  const adminMenu = await getMenu("admin");
  if (!session?.user || !(role === "ADMIN" || hasStaffAccess)) {
    return (
      <main className="min-h-screen bg-[color:var(--background)] p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Admin access</p>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">{t("unauthorized")}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--text-primary)]">
      <div className="flex min-h-screen">
        <input id="admin-nav-toggle" type="checkbox" className="peer hidden" />
        <div className="fixed inset-y-0 left-0 z-40 w-72 -translate-x-full shadow-[var(--shadow-soft)] transition peer-checked:translate-x-0 lg:static lg:translate-x-0 lg:shadow-none">
          <AdminNav
            locale={locale}
            items={adminMenu}
            allowedPermissions={Array.from(staffPermissions)}
            isAdmin={role === "ADMIN"}
          />
        </div>
        <label
          htmlFor="admin-nav-toggle"
          className="fixed inset-0 z-30 bg-black/40 opacity-0 pointer-events-none transition peer-checked:opacity-100 peer-checked:pointer-events-auto lg:hidden"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--background)]/90 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <label
                  htmlFor="admin-nav-toggle"
                  className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)] lg:hidden"
                  aria-label="Toggle admin navigation"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </label>
                <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("eyebrow")}</p>
                <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">{t("title")}</h1>
                <p className="text-sm text-[color:var(--text-muted)]">{t("description")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-2 text-xs font-semibold text-[color:var(--text-primary)]">
                  {session.user.name ?? session.user.vid}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="admin-bento">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
