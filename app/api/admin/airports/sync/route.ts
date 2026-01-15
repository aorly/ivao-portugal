import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { syncAirportIvaoById } from "@/app/[locale]/(dashboard)/admin/airports/actions";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await requireStaffPermission("admin:airports");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: { id?: string };
  try {
    payload = (await req.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const id = String(payload.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Missing airport id" }, { status: 400 });

  try {
    const result = await syncAirportIvaoById(id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
