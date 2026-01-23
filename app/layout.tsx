import type { Metadata } from "next";
import { Nunito_Sans, Poppins } from "next/font/google";
import Script from "next/script";
import { getAnalyticsConfig } from "@/lib/analytics-config";
import { getSiteConfig } from "@/lib/site-config";
import "./globals.css";

const headingFont = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700", "800"],
  display: "swap",
});

const bodyFont = Poppins({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const normalizeIconUrl = (value: string) =>
    value.startsWith("/icons/") ? value.replace("/icons/", "/site-icons/") : value;
  const iconEntries = [
    config.favicon16Url
      ? { url: normalizeIconUrl(config.favicon16Url), sizes: "16x16", type: "image/png" }
      : null,
    config.favicon32Url
      ? { url: normalizeIconUrl(config.favicon32Url), sizes: "32x32", type: "image/png" }
      : null,
    config.favicon192Url
      ? { url: normalizeIconUrl(config.favicon192Url), sizes: "192x192", type: "image/png" }
      : null,
    config.favicon512Url
      ? { url: normalizeIconUrl(config.favicon512Url), sizes: "512x512", type: "image/png" }
      : null,
  ].filter(
    (entry): entry is { url: string; sizes: string; type: string } => Boolean(entry),
  );
  const appleEntries = config.appleTouchIconUrl
    ? [{ url: normalizeIconUrl(config.appleTouchIconUrl), sizes: "180x180", type: "image/png" }]
    : undefined;
  const otherEntries = config.maskIconUrl
    ? [{ rel: "mask-icon", url: normalizeIconUrl(config.maskIconUrl) }]
    : undefined;
  const socialImages = config.socialImageUrl
    ? [
        {
          url: config.socialImageUrl,
          width: 1200,
          height: 630,
          alt: config.divisionName,
        },
      ]
    : undefined;

  return {
    title: "IVAO Portugal Hub",
    description: "Operations, events, and pilot resources for IVAO Portugal",
    icons: {
      icon: iconEntries.length ? iconEntries : undefined,
      shortcut: config.faviconIcoUrl ? normalizeIconUrl(config.faviconIcoUrl) : undefined,
      apple: appleEntries,
      other: otherEntries,
    },
    openGraph: socialImages ? { images: socialImages } : undefined,
    twitter: socialImages ? { card: "summary_large_image", images: socialImages } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analyticsConfig = await getAnalyticsConfig();
  const ga4Id = analyticsConfig.ga4MeasurementId?.trim() ?? "";
  const umamiId = analyticsConfig.umamiWebsiteId?.trim() ?? "";
  const umamiSrc = analyticsConfig.umamiScriptUrl?.trim() || "https://analytics.umami.is/script.js";
  const plausibleDomain = analyticsConfig.plausibleDomain?.trim() ?? "";
  const plausibleSrc = analyticsConfig.plausibleScriptUrl?.trim() || "https://plausible.io/js/script.js";

  return (
    <html lang="en" className="min-h-full" data-theme="light" suppressHydrationWarning>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} antialiased bg-[color:var(--background)] text-[color:var(--text-primary)]`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var stored=localStorage.getItem("theme");var next=stored==="dark"||stored==="light"?stored:"light";document.documentElement.dataset.theme=next;}catch(e){document.documentElement.dataset.theme="light";}})();`}
        </Script>
        {ga4Id ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4Id}', { send_page_view: false });`}
            </Script>
          </>
        ) : null}
        {umamiId ? (
          <Script
            src={umamiSrc}
            data-website-id={umamiId}
            strategy="afterInteractive"
            defer
          />
        ) : null}
        {plausibleDomain ? (
          <Script
            src={plausibleSrc}
            data-domain={plausibleDomain}
            strategy="afterInteractive"
            defer
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
