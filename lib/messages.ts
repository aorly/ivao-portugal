import { type Locale, locales } from "@/i18n";

export async function getMessages(locale: Locale) {
  if (!locales.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  switch (locale) {
    case "pt":
      return (await import("@/messages/pt.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}
