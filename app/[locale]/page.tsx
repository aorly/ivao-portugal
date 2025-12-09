import { redirect } from "next/navigation";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function LocaleIndexPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/home`);
}
