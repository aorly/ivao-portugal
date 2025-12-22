import { promises as fs } from "fs";
import path from "path";

export type AnalyticsConfig = {
  ga4MeasurementId?: string;
  umamiWebsiteId?: string;
  umamiScriptUrl?: string;
  plausibleDomain?: string;
  plausibleScriptUrl?: string;
  trackAdmin?: boolean;
};

const CONFIG_PATH = path.join(process.cwd(), "data", "analytics-config.json");

const defaultConfig: AnalyticsConfig = {
  ga4MeasurementId: "",
  umamiWebsiteId: "",
  umamiScriptUrl: "",
  plausibleDomain: "",
  plausibleScriptUrl: "",
  trackAdmin: false,
};

export const getAnalyticsConfig = async (): Promise<AnalyticsConfig> => {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AnalyticsConfig;
    return { ...defaultConfig, ...parsed };
  } catch {
    return { ...defaultConfig };
  }
};

export const saveAnalyticsConfig = async (config: AnalyticsConfig) => {
  const next = { ...defaultConfig, ...config };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
};
