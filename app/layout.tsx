import type { Metadata } from "next";
import { Nunito_Sans, Poppins } from "next/font/google";
import Script from "next/script";
import { getAnalyticsConfig } from "@/lib/analytics-config";
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

export const metadata: Metadata = {
  title: "IVAO Portugal Hub",
  description: "Operations, events, and pilot resources for IVAO Portugal",
};

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
    <html lang="en" className="dark min-h-full">
      <body
        className={`${headingFont.variable} ${bodyFont.variable} antialiased bg-[color:var(--background)] text-[color:var(--text-primary)]`}
      >
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
