import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const user = session?.user
    ? {
        id: session.user.id ?? null,
        name: session.user.name ?? null,
        vid: session.user.vid ?? null,
        role: session.user.role ?? null,
      }
    : null;

  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
