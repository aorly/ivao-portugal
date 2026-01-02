import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { type Locale } from "@/i18n";
import { getStaffPermissions } from "@/lib/staff";
import { getMenu } from "@/lib/menu";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
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
  const staffPermissions = session?.user?.id ? await getStaffPermissions(session.user.id) : new Set();
  const hasStaffAccess = staffPermissions.size > 0;
  const adminMenu = await getMenu("admin");
  if (!session?.user || !(role === "ADMIN" || hasStaffAccess)) {
    return (
      <main className="min-h-screen bg-slate-950 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-100">Admin access</p>
          <p className="mt-2 text-sm text-slate-400">{t("unauthorized")}</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <AdminNav
          locale={locale}
          items={adminMenu}
          allowedPermissions={Array.from(staffPermissions)}
          isAdmin={role === "ADMIN"}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("eyebrow")}</p>
                <h1 className="text-lg font-semibold text-slate-100">{t("title")}</h1>
                <p className="text-sm text-slate-400">{t("description")}</p>
              </div>
              <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200">
                {session.user.name ?? session.user.vid}
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
