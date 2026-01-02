import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { type Locale, locales } from "@/i18n";
import { getMessages } from "@/lib/messages";
import { auth } from "@/lib/auth";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { getAnalyticsConfig } from "@/lib/analytics-config";

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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AnalyticsProvider locale={locale} trackAdmin={analyticsConfig.trackAdmin} />
      {children}
    </NextIntlClientProvider>
  );
}
