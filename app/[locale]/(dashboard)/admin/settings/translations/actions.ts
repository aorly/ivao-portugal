"use server";

import path from "path";
import fs from "fs/promises";
import { type Locale, locales } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";

export type SaveTranslationsState = {
  status: "idle" | "ok" | "error";
  message?: string;
};

const getMessagesPath = (locale: Locale) => path.join(process.cwd(), "messages", `${locale}.json`);

const isPlainObject = (value: unknown) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export async function saveTranslations(
  _prevState: SaveTranslationsState,
  formData: FormData,
): Promise<SaveTranslationsState> {
  const allowed = await requireStaffPermission("admin:settings");
  if (!allowed) {
    return { status: "error", message: "You do not have access to edit translations." };
  }

  const localeValue = String(formData.get("locale") ?? "").trim() as Locale;
  const namespace = String(formData.get("namespace") ?? "").trim();
  const payload = String(formData.get("payload") ?? "").trim();

  if (!locales.includes(localeValue)) {
    return { status: "error", message: "Unsupported locale." };
  }
  if (!namespace) {
    return { status: "error", message: "Namespace is required." };
  }
  if (!payload) {
    return { status: "error", message: "JSON payload is required." };
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return { status: "error", message: "Invalid JSON payload." };
  }

  if (!isPlainObject(parsedPayload)) {
    return { status: "error", message: "JSON payload must be an object." };
  }

  const filePath = getMessagesPath(localeValue);
  let current: Record<string, unknown>;
  try {
    const raw = await fs.readFile(filePath, "utf8");
    current = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { status: "error", message: "Failed to load translations file." };
  }

  current[namespace] = parsedPayload;

  try {
    await fs.writeFile(filePath, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  } catch {
    return { status: "error", message: "Failed to write translations file." };
  }

  return { status: "ok", message: "Translations saved." };
}
