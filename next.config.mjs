import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig = {
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
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
    ];
  },
};

export default withNextIntl(nextConfig);
