import path from "path";
import fs from "fs/promises";
import { NextResponse, type NextRequest } from "next/server";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(_: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const segments = Array.isArray(resolvedParams.path) ? resolvedParams.path : [];
  const baseDir = path.join(process.cwd(), "public", "hero-slides");
  const targetPath = path.join(baseDir, ...segments);
  const normalized = path.normalize(targetPath);
  if (!normalized.startsWith(baseDir)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await fs.readFile(normalized);
    const ext = path.extname(normalized).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
