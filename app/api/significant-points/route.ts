import { NextResponse } from "next/server";
import { loadSignificantPoints, pointsToCsv } from "@/lib/significant-points";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user?.role ?? "USER";
  if (!session?.user || role === "USER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const points = await loadSignificantPoints();

  if (format === "csv") {
    return new NextResponse(pointsToCsv(points), {
      headers: { "content-type": "text/csv; charset=utf-8" },
    });
  }

  return NextResponse.json(points, { status: 200 });
}
