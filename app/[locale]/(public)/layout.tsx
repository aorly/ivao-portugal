import { Navbar } from "@/components/navigation/navbar";
import type React from "react";
import { Footer } from "@/components/navigation/footer";
import { CookieBanner } from "@/components/cookie-banner";
import { auth } from "@/lib/auth";
import { getMenu } from "@/lib/menu";
import { type StaffPermission, getStaffPermissions } from "@/lib/staff";
import { getSiteConfig } from "@/lib/site-config";
import { type Locale } from "@/i18n";
import { cookies } from "next/headers";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PublicLayout({ children, params }: Props) {
  const locale = (await params).locale as Locale;
  const session = await auth();
  const menuItems = await getMenu("public");
  const footerItems = await getMenu("footer");
  const siteConfig = await getSiteConfig();
  const cookieStore = await cookies();
  const hasCookieConsent = Boolean(cookieStore.get("cookie_consent")?.value);
  const showCookieBanner = !hasCookieConsent;
  const staffPermissions = session?.user?.id
    ? await getStaffPermissions(session.user.id)
    : new Set<StaffPermission>();

  return (
    <div className="flex min-h-screen flex-col gap-6 px-6 py-10 lg:px-12">
      <Navbar
        locale={locale}
        user={session?.user}
        items={menuItems}
        allowedPermissions={Array.from(staffPermissions)}
        isAdmin={session?.user?.role === "ADMIN"}
        brandName={siteConfig.divisionName}
        logoUrl={siteConfig.logoFullUrl}
        logoDarkUrl={siteConfig.logoFullDarkUrl || undefined}
        socialLinks={{
          facebookUrl: siteConfig.socialFacebookUrl,
          discordUrl: siteConfig.socialDiscordUrl,
          instagramUrl: siteConfig.socialInstagramUrl,
          xUrl: siteConfig.socialXUrl,
          forumUrl: siteConfig.socialForumUrl,
        }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {children}
        <Footer
          locale={locale}
          items={footerItems}
          allowedPermissions={Array.from(staffPermissions)}
          isAdmin={session?.user?.role === "ADMIN"}
          role={session?.user?.role}
          brandName={siteConfig.divisionName}
          logoUrl={siteConfig.logoCompactUrl || siteConfig.logoFullUrl}
          logoDarkUrl={siteConfig.logoCompactDarkUrl || siteConfig.logoFullDarkUrl || undefined}
          tagline={siteConfig.footerTagline}
          countries={siteConfig.countries}
          supportEmail={siteConfig.supportEmail}
          websiteUrl={siteConfig.websiteUrl}
        />
      </div>
      <CookieBanner locale={locale} initialVisible={showCookieBanner} />
    </div>
  );
}
