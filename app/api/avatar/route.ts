import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("avatar");
  const locale = formData.get("locale");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext =
    file.type === "image/png"
      ? ".png"
      : file.type === "image/webp"
        ? ".webp"
        : ".jpg";

  const fileName = `${crypto.randomUUID()}${ext}`;
  const dirPath = path.join(process.cwd(), "public", "avatars");
  const filePath = path.join(dirPath, fileName);

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, buffer);

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true, image: true },
  });
  const currentPath = existing?.avatarUrl ?? existing?.image ?? null;
  if (currentPath && currentPath.startsWith("/avatars/")) {
    const existingFile = path.join(process.cwd(), "public", currentPath.replace(/^\/+/, ""));
    await fs.unlink(existingFile).catch(() => null);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: `/avatars/${fileName}`, avatarUrl: `/avatars/${fileName}` },
  });

  if (typeof locale === "string" && locale) {
    revalidatePath(`/${locale}/profile`);
  }

  return NextResponse.json({ ok: true, path: `/avatars/${fileName}` });
}
