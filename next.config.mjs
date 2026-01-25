import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig = {
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/:locale(en|pt)/:file(frontpic.png|ivaopt.svg)",
        destination: "/:file",
      },
      {
        source: "/:locale(en|pt)/avatars/:path*",
        destination: "/avatars/:path*",
      },
      {
        source: "/:locale(en|pt)/airline-logos/:path*",
        destination: "/airline-logos/:path*",
      },
      {
        source: "/:locale(en|pt)/hero-slides/:path*",
        destination: "/hero-slides/:path*",
      },
      {
        source: "/:locale(en|pt)/icons/:path*",
        destination: "/icons/:path*",
      },
      {
        source: "/:locale(en|pt)/site-icons/:path*",
        destination: "/site-icons/:path*",
      },
      {
        source: "/:locale(en|pt)/social/:path*",
        destination: "/social/:path*",
      },
      {
        source: "/:locale(en|pt)/branding/:path*",
        destination: "/branding/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
