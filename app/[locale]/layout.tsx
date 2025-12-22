import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { type Locale, locales } from "@/i18n";
import { getMessages } from "@/lib/messages";
import { Navbar } from "@/components/navigation/navbar";
import { auth } from "@/lib/auth";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { getAnalyticsConfig } from "@/lib/analytics-config";
import { getMenu } from "@/lib/menu";
import { getStaffPermissions } from "@/lib/staff";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages(locale);
  const session = await auth();
  const analyticsConfig = await getAnalyticsConfig();
  const menuItems = await getMenu("public");
  const staffPermissions = session?.user?.id ? await getStaffPermissions(session.user.id) : new Set();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col gap-6 px-6 py-10 lg:px-8">
        <Navbar
          locale={locale}
          user={session?.user}
          items={menuItems}
          allowedPermissions={Array.from(staffPermissions)}
          isAdmin={session?.user?.role === "ADMIN"}
        />
        <AnalyticsProvider locale={locale} trackAdmin={analyticsConfig.trackAdmin} />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
