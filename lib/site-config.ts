import { promises as fs } from "fs";
import path from "path";

export type SiteConfig = {
  divisionName: string;
  divisionShortName: string;
  countries: string;
  divisionId: string;
  logoFullUrl: string;
  logoCompactUrl: string;
  logoFullDarkUrl: string;
  logoCompactDarkUrl: string;
  footerTagline: string;
  supportEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  websiteUrl: string;
  socialFacebookUrl: string;
  socialDiscordUrl: string;
  socialInstagramUrl: string;
  socialXUrl: string;
  socialForumUrl: string;
  discordWidgetUrl: string;
  faviconIcoUrl: string;
  favicon16Url: string;
  favicon32Url: string;
  favicon192Url: string;
  favicon512Url: string;
  appleTouchIconUrl: string;
  maskIconUrl: string;
  socialImageUrl: string;
  ratingBadgesPilot: Record<string, string>;
  ratingBadgesAtc: Record<string, string>;
  ratingBadgesNetwork: Record<string, string>;
  ratingBadgesCustom: Record<string, string>;
};

const CONFIG_PATH = path.join(process.cwd(), "data", "site-config.json");

const defaultConfig: SiteConfig = {
  divisionName: "IVAO Portugal",
  divisionShortName: "IVAO PT",
  countries: "Portugal",
  divisionId: "PT",
  logoFullUrl: "/ivaopt.svg",
  logoCompactUrl: "/ivaopt.svg",
  logoFullDarkUrl: "",
  logoCompactDarkUrl: "",
  footerTagline: "IVAO Portugal is the division for virtual aviation in Portugal, providing events and ATC ops.",
  supportEmail: "",
  smtpHost: "",
  smtpPort: "",
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  websiteUrl: "",
  socialFacebookUrl: "",
  socialDiscordUrl: "",
  socialInstagramUrl: "",
  socialXUrl: "",
  socialForumUrl: "",
  discordWidgetUrl: "",
  faviconIcoUrl: "",
  favicon16Url: "",
  favicon32Url: "",
  favicon192Url: "",
  favicon512Url: "",
  appleTouchIconUrl: "",
  maskIconUrl: "",
  socialImageUrl: "",
  ratingBadgesPilot: {},
  ratingBadgesAtc: {},
  ratingBadgesNetwork: {},
  ratingBadgesCustom: {},
};

export const getSiteConfig = async (): Promise<SiteConfig> => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SiteConfig>;
    return { ...defaultConfig, ...parsed };
  } catch {
    return { ...defaultConfig };
  }
};

export const saveSiteConfig = async (config: Partial<SiteConfig>) => {
  const next = { ...defaultConfig, ...config };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
};
