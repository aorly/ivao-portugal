import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthOptions } from "next-auth";
import type { OAuthConfig } from "@auth/core/providers";
import type { AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";

type IvaoProfile = {
  id?: string;
  vid?: string;
  sub?: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  given_name?: string;
  family_name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  image?: string;
  nickname?: string;
};

const ivaOAuth: OAuthConfig<IvaoProfile> = {
  id: "ivao",
  name: "IVAO",
  type: "oidc",
  wellKnown: process.env.IVAO_WELL_KNOWN ?? "https://api.ivao.aero/.well-known/openid-configuration",
  clientId: process.env.IVAO_CLIENT_ID,
  clientSecret: process.env.IVAO_CLIENT_SECRET,
  checks: ["pkce", "nonce", "state"],
  client: {
    id_token_signed_response_alg: "RS512",
  },
  authorization: {
    params: { scope: process.env.IVAO_OAUTH_SCOPE ?? "openid profile email" },
  },
  token: process.env.IVAO_OAUTH_TOKEN ?? "https://api.ivao.aero/v2/oauth/token",
  userinfo: {
    url: process.env.IVAO_OAUTH_USERINFO ?? "https://api.ivao.aero/v2/users/me",
    /**
     * IVAO API v2 requires the X-API-Key header for user data (see docs).
     */
    async request({ tokens, provider }) {
      const apiKey = process.env.IVAO_API_KEY;
      const res = await fetch(provider.userinfo?.url ?? "https://api.ivao.aero/v2/users/me", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch IVAO userinfo (${res.status})`);
      }
      return await res.json();
    },
  },
  issuer: process.env.IVAO_ISSUER ?? "https://api.ivao.aero",
  profile(profile) {
    const data = profile as IvaoProfile;
    const vid = data.vid ?? data.id ?? data.sub ?? data.username ?? "unknown";
    const image = data.avatar ?? data.image;
    const bestName =
      data.fullName ??
      data.name ??
      (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined) ??
      (data.given_name && data.family_name ? `${data.given_name} ${data.family_name}` : undefined) ??
      data.given_name ??
      data.firstName ??
      data.username ??
      data.nickname ??
      vid;

    return {
      id: vid,
      vid,
      name: bestName,
      email: data.email,
      image,
    };
  },
};

type NavigraphProfile = {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
};

const navigraphOAuth: OAuthConfig<NavigraphProfile> = {
  id: "navigraph",
  name: "Navigraph",
  type: "oauth",
  clientId: process.env.NAVIGRAPH_CLIENT_ID,
  clientSecret: process.env.NAVIGRAPH_CLIENT_SECRET,
  authorization: {
    url: process.env.NAVIGRAPH_OAUTH_AUTHORIZE ?? "https://identity.api.navigraph.com/connect/authorize",
    params: { scope: process.env.NAVIGRAPH_OAUTH_SCOPE ?? "openid profile email charts" },
  },
  token: process.env.NAVIGRAPH_OAUTH_TOKEN ?? "https://identity.api.navigraph.com/connect/token",
  userinfo: process.env.NAVIGRAPH_OAUTH_USERINFO ?? "https://identity.api.navigraph.com/connect/userinfo",
  profile(profile) {
    const data = profile as NavigraphProfile;
    const id = data.sub ?? "navigraph";
    return {
      id,
      vid: id,
      name: data.name ?? "Navigraph User",
      email: data.email,
      image: data.picture,
    };
  },
};

const baseAdapter = PrismaAdapter(prisma);

type AdapterUserWithVid = AdapterUser & {
  vid?: string;
  avatarUrl?: string | null;
  role?: string;
  navigraphId?: string | null;
};

const adapter: NextAuthOptions["adapter"] = {
  ...baseAdapter,
  async createUser(data: AdapterUserWithVid) {
    const vid =
      data.vid ??
      data.id ??
      (data.email ? data.email.split("@")[0] : undefined) ??
      crypto.randomUUID();

    return prisma.user.create({
      data: {
        vid,
        name: data.name ?? vid,
        email: data.email,
        emailVerified: data.emailVerified ?? null,
        image: data.image ?? null,
        avatarUrl: data.avatarUrl ?? data.image ?? null,
        role: data.role ?? "USER",
      },
    });
  },
};

export const authConfig: NextAuthOptions = {
  adapter,
  providers: [ivaOAuth, navigraphOAuth],
  session: { strategy: "database" },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      const typedUser = user as AdapterUserWithVid | undefined;

      // Prefer fresh profile data from IVAO when present
      if (profile && account?.provider === "ivao") {
        const p = profile as IvaoProfile;
        const vidProfile = p.vid ?? p.id ?? p.sub ?? p.username ?? token.sub;
        const bestName = p.fullName ?? p.name ?? p.username ?? token.name ?? vidProfile;
        token.name = bestName;
        token.vid = token.vid ?? vidProfile;
      }

      if (user) {
        token.uid = typedUser?.id ?? token.sub;
        token.vid = typedUser?.vid ?? account?.providerAccountId ?? token.sub;
        token.role = typedUser?.role ?? "USER";
        token.navigraphId = typedUser?.navigraphId ?? null;
        token.name = typedUser?.name ?? token.name ?? token.sub;
      }

      if (account?.provider === "navigraph" && token.sub) {
        const navigraphId = account.providerAccountId;
        await prisma.user.update({
          where: { id: token.uid as string },
          data: { navigraphId },
        });
        token.navigraphId = navigraphId;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token || !session.user) return session;

      // Refresh user data from DB to keep name/vid accurate
      const dbUser = await prisma.user.findUnique({
        where: { id: (token.uid as string) ?? session.user.id },
        select: { id: true, vid: true, name: true, role: true, navigraphId: true, image: true },
      });

      // If we have a better name from the token and the DB name is empty or just the VID, persist it.
      if (dbUser && token.name && (!dbUser.name || dbUser.name === dbUser.vid)) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { name: token.name as string },
        });
        dbUser.name = token.name as string;
      }

      session.user.id = (token.uid as string) ?? session.user.id;
      session.user.vid = dbUser?.vid ?? (token.vid as string) ?? session.user.vid;
      session.user.name = dbUser?.name ?? (token.name as string | undefined) ?? session.user.name;
      session.user.role = dbUser?.role ?? (token.role as string) ?? "USER";
      session.user.navigraphId = (dbUser?.navigraphId as string | null) ?? (token.navigraphId as string | null) ?? null;
      session.user.image = dbUser?.image ?? session.user.image;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
