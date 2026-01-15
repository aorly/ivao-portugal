import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { locales, type Locale } from "@/i18n";
import { getMessages } from "@/lib/messages";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { getAnalyticsConfig } from "@/lib/analytics-config";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const locale = (await params).locale as Locale;

  if (!locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages(locale);
  const analyticsConfig = await getAnalyticsConfig();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Suspense fallback={null}>
        <AnalyticsProvider locale={locale} trackAdmin={analyticsConfig.trackAdmin} />
      </Suspense>
      {children}
    </NextIntlClientProvider>
  );
}
