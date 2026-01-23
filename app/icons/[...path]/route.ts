import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

const resolveBaseDirs = (folder: string) => {
  const cwd = process.cwd();
  const dirs: string[] = [];
  for (let depth = 0; depth <= 6; depth += 1) {
    const parts = [cwd, ...Array(depth).fill(".."), "public", folder];
    const dir = path.resolve(...parts);
    if (!dirs.includes(dir)) dirs.push(dir);
  }
  return dirs;
};

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolved = await params;
  const parts = Array.isArray(resolved.path) ? resolved.path : [resolved.path];
  if (parts.some((part) => part.includes(".."))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const baseDirs = resolveBaseDirs("icons");
  for (const baseDir of baseDirs) {
    const filePath = path.join(baseDir, ...parts);
    if (!filePath.startsWith(baseDir)) continue;
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
      // try next base dir
    }
  }
  return new NextResponse("Not found", { status: 404 });
}
