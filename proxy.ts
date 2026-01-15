import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export default intlMiddleware;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|branding|icons|social|badges|ivaopt.svg|robots.txt|sitemap.xml).*)"],
};
