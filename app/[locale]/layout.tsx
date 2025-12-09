import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { type Locale, locales } from "@/i18n";
import { getMessages } from "@/lib/messages";
import { Navbar } from "@/components/navigation/navbar";
import { auth } from "@/lib/auth";

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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10 lg:px-8">
        <Navbar locale={locale} user={session?.user} />
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
