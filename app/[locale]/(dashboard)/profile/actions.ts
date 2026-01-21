"use server";

import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export async function deleteAtcBookingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.ivaoAccessToken) {
    return;
  }
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!bookingId) return;

  try {
    await ivaoClient.deleteAtcBooking(bookingId, session.user.ivaoAccessToken);
  } catch {
    return;
  }
}

export async function updateStaffProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  const staffPhotoUrl = String(formData.get("staffPhotoUrl") ?? "").trim() || null;
  const staffBio = String(formData.get("staffBio") ?? "").trim() || null;
  const publicStaffProfile = formData.get("publicStaffProfile") === "on";
  const locale = String(formData.get("locale") ?? "en");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { staffPhotoUrl, staffBio, publicStaffProfile },
  });

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/staff`);
}

const MAX_BANNER_SIZE = 3 * 1024 * 1024;
const BANNER_DIR = "creator-banners";
const BANNER_ROOT = path.join(process.cwd(), "public");
const BANNER_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

const saveBannerUpload = async (entry: FormDataEntryValue | null) => {
  if (!entry || typeof entry !== "object" || !("arrayBuffer" in entry)) return null;
  const file = entry as File;
  if (file.size === 0 || file.size > MAX_BANNER_SIZE) return null;
  const ext = BANNER_TYPES[file.type];
  if (!ext) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(BANNER_ROOT, BANNER_DIR);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), buffer);
  return `/${BANNER_DIR}/${filename}`;
};

export async function updateCreatorBannerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }

  const locale = String(formData.get("locale") ?? "en");
  const bannerUrl = await saveBannerUpload(formData.get("creatorBanner"));
  if (!bannerUrl) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { creatorBannerUrl: bannerUrl },
  });

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/home`);
}

export async function deleteCreatorBannerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }
  const locale = String(formData.get("locale") ?? "en");
  await prisma.user.update({
    where: { id: session.user.id },
    data: { creatorBannerUrl: null },
  });
  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/home`);
}

const AIRLINE_LOGO_DIR = "airline-logos";
const AIRLINE_LOGO_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const saveAirlineLogoUpload = async (icao: string, entry: FormDataEntryValue | null) => {
  if (!entry || typeof entry !== "object" || !("arrayBuffer" in entry)) return null;
  const file = entry as File;
  if (file.size === 0) return null;
  const ext = AIRLINE_LOGO_TYPES[file.type];
  if (!ext) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${icao.toLowerCase()}-${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(process.cwd(), "public", AIRLINE_LOGO_DIR);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), buffer);
  return `/${AIRLINE_LOGO_DIR}/${filename}`;
};

export async function updateCeoAirlineLogoAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.vid) {
    return;
  }
  const locale = String(formData.get("locale") ?? "en");
  const icao = String(formData.get("icao") ?? "").trim().toUpperCase();
  const variant = String(formData.get("variant") ?? "light");
  if (!icao) return;
  const airline = await prisma.airline.findUnique({
    where: { icao },
    select: { icao: true, ceoVid: true },
  });
  if (!airline?.ceoVid || airline.ceoVid !== session.user.vid) return;
  const logoUrl = await saveAirlineLogoUpload(icao, formData.get("logo"));
  if (!logoUrl) return;
  await prisma.airline.update({
    where: { icao },
    data: variant === "dark" ? { logoDarkUrl: logoUrl } : { logoUrl },
  });
  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/airlines`);
}
