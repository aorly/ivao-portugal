import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { RESOURCE_DIR } from "@/lib/significant-points";

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = params.name;

  const safeName = path.basename(name);
  if (safeName !== name) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const filePath = path.join(RESOURCE_DIR, safeName);
  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
