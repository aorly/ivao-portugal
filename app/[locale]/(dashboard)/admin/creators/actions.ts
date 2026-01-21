"use server";

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";

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

export async function updateCreatorBannerAdminAction(formData: FormData) {
  const allowed = await requireStaffPermission("admin:staff");
  if (!allowed) return;
  const userId = String(formData.get("userId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  if (!userId) return;
  const bannerUrl = await saveBannerUpload(formData.get("creatorBanner"));
  if (!bannerUrl) return;

  await prisma.user.update({
    where: { id: userId },
    data: { creatorBannerUrl: bannerUrl },
  });

  revalidatePath(`/${locale}/admin/creators`);
  revalidatePath(`/${locale}/home`);
}

export async function clearCreatorBannerAdminAction(formData: FormData) {
  const allowed = await requireStaffPermission("admin:staff");
  if (!allowed) return;
  const userId = String(formData.get("userId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  if (!userId) return;
  await prisma.user.update({
    where: { id: userId },
    data: { creatorBannerUrl: null },
  });
  revalidatePath(`/${locale}/admin/creators`);
  revalidatePath(`/${locale}/home`);
}
