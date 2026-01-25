"use server";

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";

type ActionState = { success?: boolean; error?: string };

const parseOrder = (value: FormDataEntryValue | null) => {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asText = (value: FormDataEntryValue | null) => String(value ?? "").trim();

const asOptional = (value: FormDataEntryValue | null) => {
  const text = asText(value);
  return text.length ? text : null;
};

const asBool = (value: FormDataEntryValue | null) => value === "on" || value === "true";

const revalidateHero = (locale: string) => {
  revalidatePath(`/${locale}/admin/hero`);
  revalidatePath(`/${locale}/home`);
};

const IMAGE_DIR = "hero-slides";
const IMAGE_ROOT = path.join(process.cwd(), "public");
const IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};
const IMAGE_EXTENSIONS = new Set(Object.values(IMAGE_TYPES));

const saveImageUpload = async (entry: FormDataEntryValue | null) => {
  if (!entry || typeof entry !== "object" || !("arrayBuffer" in entry)) return null;
  const file = entry as File;
  if (file.size === 0) return null;
  const contentType = file.type.split(";")[0].trim().toLowerCase();
  let ext: string | undefined = IMAGE_TYPES[contentType];
  if (!ext && file.name) {
    const nameExt = path.extname(file.name).toLowerCase();
    ext = IMAGE_EXTENSIONS.has(nameExt) ? nameExt : undefined;
  }
  if (!ext) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(IMAGE_ROOT, IMAGE_DIR);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), buffer);
  return `/${IMAGE_DIR}/${filename}`;
};

export async function createHeroSlide(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const allowed = await requireStaffPermission("admin:hero");
  if (!allowed) return { success: false, error: "Unauthorized" };

  const locale = asText(formData.get("locale"));
  const title = asText(formData.get("title"));
  if (!locale) return { success: false, error: "Locale is required." };
  if (!title) return { success: false, error: "Title is required." };

  const uploadedImageUrl = await saveImageUpload(formData.get("imageFile"));
  const imageUrl = uploadedImageUrl ?? asOptional(formData.get("imageUrl"));

  await prisma.heroSlide.create({
    data: {
      locale,
      title,
      eyebrow: asOptional(formData.get("eyebrow")),
      subtitle: asOptional(formData.get("subtitle")),
      imageUrl,
      imageAlt: asOptional(formData.get("imageAlt")),
      ctaLabel: asOptional(formData.get("ctaLabel")),
      ctaHref: asOptional(formData.get("ctaHref")),
      secondaryLabel: asOptional(formData.get("secondaryLabel")),
      secondaryHref: asOptional(formData.get("secondaryHref")),
      order: parseOrder(formData.get("order")),
      isPublished: asBool(formData.get("isPublished")),
      fullWidth: asBool(formData.get("fullWidth")),
    },
  });

  revalidateHero(locale);
  return { success: true };
}

export async function updateHeroSlide(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const allowed = await requireStaffPermission("admin:hero");
  if (!allowed) return { success: false, error: "Unauthorized" };

  const id = asText(formData.get("id"));
  const locale = asText(formData.get("locale"));
  const title = asText(formData.get("title"));
  if (!id) return { success: false, error: "Slide id is required." };
  if (!locale) return { success: false, error: "Locale is required." };
  if (!title) return { success: false, error: "Title is required." };

  const uploadedImageUrl = await saveImageUpload(formData.get("imageFile"));
  const imageUrl = uploadedImageUrl ?? asOptional(formData.get("imageUrl"));

  await prisma.heroSlide.update({
    where: { id },
    data: {
      locale,
      title,
      eyebrow: asOptional(formData.get("eyebrow")),
      subtitle: asOptional(formData.get("subtitle")),
      imageUrl,
      imageAlt: asOptional(formData.get("imageAlt")),
      ctaLabel: asOptional(formData.get("ctaLabel")),
      ctaHref: asOptional(formData.get("ctaHref")),
      secondaryLabel: asOptional(formData.get("secondaryLabel")),
      secondaryHref: asOptional(formData.get("secondaryHref")),
      order: parseOrder(formData.get("order")),
      isPublished: asBool(formData.get("isPublished")),
      fullWidth: asBool(formData.get("fullWidth")),
    },
  });

  revalidateHero(locale);
  return { success: true };
}

export async function deleteHeroSlide(formData: FormData) {
  const allowed = await requireStaffPermission("admin:hero");
  if (!allowed) return;
  const id = asText(formData.get("id"));
  const locale = asText(formData.get("locale"));
  if (!id) return;
  await prisma.heroSlide.delete({ where: { id } });
  if (locale) revalidateHero(locale);
}
