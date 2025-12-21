import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig = {
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
    ];
  },
};

export default withNextIntl(nextConfig);