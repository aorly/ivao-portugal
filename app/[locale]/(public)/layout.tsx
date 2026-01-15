import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/navigation/footer";
import { auth } from "@/lib/auth";
import { getMenu } from "@/lib/menu";
import { getStaffPermissions } from "@/lib/staff";
import { getSiteConfig } from "@/lib/site-config";
import { type Locale } from "@/i18n";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
};

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await auth();
  const menuItems = await getMenu("public");
  const footerItems = await getMenu("footer");
  const siteConfig = await getSiteConfig();
  const staffPermissions = session?.user?.id ? await getStaffPermissions(session.user.id) : new Set();

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
    </div>
  );
}
