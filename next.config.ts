import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  async rewrites() {
    return [
      // Allow locale-prefixed requests for public assets to fall back to the root /public files.
      {
        source: "/:locale(en|pt)/:file(frontpic.png|ivaopt.svg)",
        destination: "/:file",
      },
      {
        source: "/:locale(en|pt)/airline-logos/:path*",
        destination: "/airline-logos/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
