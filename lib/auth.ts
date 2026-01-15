import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "ivao_session";
const ISSUER = "ivao-pt";
const AUDIENCE = "ivao-pt-web";
const SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours

type SessionPayload = {
  sub: string;
  vid?: string | null;
  name?: string | null;
  role?: UserRole;
  ivaoAccessToken?: string | null;
};

type UserRole = "USER" | "STAFF" | "ADMIN";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for session signing");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(payload: SessionPayload) {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getSecretKey());

  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    let role: UserRole | undefined = payload.role;
    // Fallback for older sessions without role embedded.
    if (!role) {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role: true },
      });
      role = (dbUser?.role as UserRole) ?? "USER";
    }
    return {
      user: {
        id: payload.sub,
        vid: payload.vid ?? null,
        name: payload.name ?? null,
        role,
        ivaoAccessToken: payload.ivaoAccessToken ?? null,
      },
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session) {
    const locale = (await headers()).get("x-locale") ?? "en";
    return NextResponse.redirect(`/${locale}/login`);
  }
  return session;
}

export async function destroySession() {
  (await cookies()).set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
}
