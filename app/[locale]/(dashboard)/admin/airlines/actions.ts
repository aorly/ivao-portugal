"use server";

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { requireStaffPermission } from "@/lib/staff";

const LOGO_DIR = "airline-logos";
const LOGO_ROOT = path.join(process.cwd(), "public");
const LOGO_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const LOGO_EXTENSIONS = new Set(Object.values(LOGO_TYPES));

type AirlinePayload = {
  icao?: string;
  iata?: string | null;
  name?: string;
  countryId?: string | null;
  callsign?: string | null;
  realBased?: boolean | null;
  website?: string | null;
  military?: string | null;
  generalAviation?: boolean | null;
};

type VirtualAirlineSummary = {
  id?: number | string;
  airlineId?: string;
  website?: string | null;
};

type VirtualAirlineDetail = {
  id?: number | string;
  airlineId?: string;
  ceoVid?: number | string;
  ceoName?: string;
  ceoMail?: string;
  website?: string | null;
  name?: string;
  divisionId?: string;
};

const parseIcaoList = (input: string) => {
  const cleaned = input
    .split(/[\s,;]+/g)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(cleaned)).filter((value) => /^[A-Z0-9]{2,4}$/.test(value));
};

const saveLogo = async (icao: string, contentType: string, data: ArrayBuffer) => {
  const ext = LOGO_TYPES[contentType.split(";")[0].trim().toLowerCase()] ?? ".png";
  const filename = `${icao.toLowerCase()}-${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(LOGO_ROOT, LOGO_DIR);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), Buffer.from(data));
  return `/${LOGO_DIR}/${filename}`;
};

const saveLogoUpload = async (icao: string, entry: FormDataEntryValue | null) => {
  if (!entry || typeof entry !== "object" || !("arrayBuffer" in entry)) return null;
  const file = entry as File;
  if (file.size === 0) return null;
  const contentType = file.type.split(";")[0].trim().toLowerCase();
  let ext = LOGO_TYPES[contentType];
  if (!ext && file.name) {
    const nameExt = path.extname(file.name).toLowerCase();
    ext = LOGO_EXTENSIONS.has(nameExt) ? nameExt : undefined;
  }
  if (!ext) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${icao.toLowerCase()}-${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(LOGO_ROOT, LOGO_DIR);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), buffer);
  return `/${LOGO_DIR}/${filename}`;
};

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

const syncAirline = async (icao: string) => {
  const payload = (await ivaoClient.getAirline(icao).catch(() => null)) as AirlinePayload | null;
  if (!payload?.icao || !payload?.name) return;

  let logoUrl: string | null = null;

  let virtualAirlineId: number | null = null;
  let ceoVid: string | null = null;
  let ceoName: string | null = null;
  let ceoMail: string | null = null;
  let website = payload.website ?? null;
  const virtualAirlinesRaw = await ivaoClient.getAirlineVirtualAirlines(icao).catch(() => []);
  const virtualAirlines = asArray(virtualAirlinesRaw) as VirtualAirlineSummary[];
  let selectedDetail: VirtualAirlineDetail | null = null;
  for (const candidate of virtualAirlines) {
    if (candidate?.id == null) continue;
    const detail = (await ivaoClient.getVirtualAirline(candidate.id).catch(() => null)) as VirtualAirlineDetail | null;
    if (!detail) continue;
    if (!selectedDetail) selectedDetail = detail;
    if (detail.divisionId?.toUpperCase() === "PT") {
      selectedDetail = detail;
      break;
    }
  }
  if (selectedDetail) {
    virtualAirlineId =
      typeof selectedDetail.id === "number" ? selectedDetail.id : Number(selectedDetail.id) || null;
    ceoVid = selectedDetail.ceoVid != null ? String(selectedDetail.ceoVid) : null;
    ceoName = selectedDetail.ceoName ?? null;
    ceoMail = selectedDetail.ceoMail ?? null;
    website = selectedDetail.website ?? website;
  }

  if (virtualAirlineId) {
    const mainLogo = await ivaoClient.getVirtualAirlineLogo(virtualAirlineId).catch(() => null);
    if (mainLogo?.data && mainLogo.contentType) {
      logoUrl = await saveLogo(icao, mainLogo.contentType, mainLogo.data);
    }
  }

  if (!logoUrl) {
    const logo = await ivaoClient.getAirlineLogo(icao).catch(() => null);
    if (logo?.data && logo.contentType) {
      logoUrl = await saveLogo(icao, logo.contentType, logo.data);
    }
  }

  await prisma.airline.upsert({
    where: { icao: payload.icao.toUpperCase() },
    create: {
      icao: payload.icao.toUpperCase(),
      iata: payload.iata ?? null,
      name: payload.name,
      countryId: payload.countryId ?? null,
      callsign: payload.callsign ?? null,
      realBased: payload.realBased ?? false,
      website,
      military: payload.military ?? null,
      generalAviation: payload.generalAviation ?? false,
      logoUrl,
      virtualAirlineId,
      ceoVid,
      ceoName,
      ceoMail,
    },
    update: {
      iata: payload.iata ?? null,
      name: payload.name,
      countryId: payload.countryId ?? null,
      callsign: payload.callsign ?? null,
      realBased: payload.realBased ?? false,
      website,
      military: payload.military ?? null,
      generalAviation: payload.generalAviation ?? false,
      logoUrl: logoUrl ?? undefined,
      virtualAirlineId,
      ceoVid,
      ceoName,
      ceoMail,
    },
  });
};

export async function importAirlinesAction(formData: FormData) {
  const allowed = await requireStaffPermission("admin:airlines");
  if (!allowed) return;

  const raw = String(formData.get("icao") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const icaos = parseIcaoList(raw);
  if (icaos.length === 0) return;

  for (const icao of icaos) {
    await syncAirline(icao);
  }

  revalidatePath(`/${locale}/admin/airlines`);
  revalidatePath(`/${locale}/airlines`);
}

export async function deleteAirlineAction(formData: FormData) {
  const allowed = await requireStaffPermission("admin:airlines");
  if (!allowed) return;
  const locale = String(formData.get("locale") ?? "en");
  const icao = String(formData.get("icao") ?? "").trim().toUpperCase();
  if (!icao) return;
  await prisma.airline.delete({ where: { icao } });
  revalidatePath(`/${locale}/admin/airlines`);
  revalidatePath(`/${locale}/airlines`);
}

export async function updateAirlineLogoAction(formData: FormData) {
  const allowed = await requireStaffPermission("admin:airlines");
  if (!allowed) return;
  const locale = String(formData.get("locale") ?? "en");
  const icao = String(formData.get("icao") ?? "").trim().toUpperCase();
  const variant = String(formData.get("variant") ?? "light");
  if (!icao) return;
  const logoUrl = await saveLogoUpload(icao, formData.get("logo"));
  if (!logoUrl) return;
  await prisma.airline.update({
    where: { icao },
    data: variant === "dark" ? { logoDarkUrl: logoUrl } : { logoUrl },
  });
  revalidatePath(`/${locale}/admin/airlines`);
  revalidatePath(`/${locale}/airlines`);
}

export async function syncAirlineAction(formData: FormData) {
  const allowed = await requireStaffPermission("admin:airlines");
  if (!allowed) return;
  const locale = String(formData.get("locale") ?? "en");
  const icao = String(formData.get("icao") ?? "").trim().toUpperCase();
  if (!icao) return;
  await syncAirline(icao);
  revalidatePath(`/${locale}/admin/airlines`);
  revalidatePath(`/${locale}/airlines`);
}

export async function updateAirlineDescriptionAction(formData: FormData) {
  const allowed = await requireStaffPermission("admin:airlines");
  if (!allowed) return;
  const locale = String(formData.get("locale") ?? "en");
  const icao = String(formData.get("icao") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  if (!icao) return;
  await prisma.airline.update({
    where: { icao },
    data: { description: description || null },
  });
  revalidatePath(`/${locale}/admin/airlines`);
  revalidatePath(`/${locale}/airlines/${icao}`);
}
