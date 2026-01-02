import { promises as fs } from "fs";
import path from "path";

export type SiteConfig = {
  divisionName: string;
  divisionShortName: string;
  countries: string;
  logoFullUrl: string;
  logoCompactUrl: string;
  footerTagline: string;
  supportEmail: string;
  websiteUrl: string;
};

const CONFIG_PATH = path.join(process.cwd(), "data", "site-config.json");

const defaultConfig: SiteConfig = {
  divisionName: "IVAO Portugal",
  divisionShortName: "IVAO PT",
  countries: "Portugal",
  logoFullUrl: "/ivaopt.svg",
  logoCompactUrl: "/ivaopt.svg",
  footerTagline: "IVAO Portugal is the division for virtual aviation in Portugal, providing events, tours, and ATC ops.",
  supportEmail: "",
  websiteUrl: "",
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
