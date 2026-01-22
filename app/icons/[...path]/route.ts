import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const BASE_DIR = path.join(process.cwd(), "public", "icons");

const contentTypeFor = (ext: string) => {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
};

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const parts = Array.isArray(params.path) ? params.path : [params.path];
  if (parts.some((part) => part.includes(".."))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const filePath = path.join(BASE_DIR, ...parts);
  if (!filePath.startsWith(BASE_DIR)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentTypeFor(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
