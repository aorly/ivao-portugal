import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Allow locale-prefixed requests for public assets to fall back to the root /public files.
      {
        source: "/:locale(en|pt)/:file(frontpic.png|ivaopt.svg)",
        destination: "/:file",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
