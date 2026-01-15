import { PrismaClient } from "@prisma/client";

const API_BASE = process.env.IVAO_API_BASE ?? "https://api.ivao.aero";
const API_KEY = process.env.IVAO_API_KEY;
const CLIENT_ID = process.env.IVAO_CLIENT_ID;
const CLIENT_SECRET = process.env.IVAO_CLIENT_SECRET;
const CLIENT_SCOPE = process.env.IVAO_OAUTH_SCOPE ?? "openid profile email";

const prisma = new PrismaClient();

const nowSeconds = () => Math.floor(Date.now() / 1000);

let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > nowSeconds() + 30) return cachedToken.value;
  if (!CLIENT_ID || !CLIENT_SECRET) return null;

  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: CLIENT_SCOPE,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IVAO token failed: ${res.status} ${res.statusText} ${body}`);
  }

  const data = await res.json();
  const token = data.access_token;
  if (!token) return null;
  cachedToken = { value: token, expiresAt: nowSeconds() + (data.expires_in ?? 300) };
  return token;
}

async function fetchUserProfile(vid) {
  const bearer = await getAccessToken();
  const headers = {
    Accept: "application/json",
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
  };
  const res = await fetch(`${API_BASE}/v2/users/${encodeURIComponent(vid)}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IVAO profile failed: ${res.status} ${res.statusText} ${body}`);
  }
  return res.json();
}

function pickName(profile) {
  if (!profile || typeof profile !== "object") return null;
  const given = profile.given_name ?? profile.firstName ?? "";
  const family = profile.family_name ?? profile.lastName ?? "";
  const merged = `${given} ${family}`.trim();
  const name = merged || profile.fullName || profile.name || profile.publicNickname || null;
  if (!name) return null;
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return null;
  return trimmed;
}

function isBadName(value, vid) {
  if (!value) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  if (trimmed === String(vid)) return true;
  return /^\d+$/.test(trimmed);
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, vid: true, name: true },
  });
  const targets = users.filter((u) => isBadName(u.name, u.vid));
  console.log(`Found ${targets.length} users with VID-only names.`);

  let updated = 0;
  for (const user of targets) {
    try {
      const raw = await fetchUserProfile(user.vid);
      const profile = raw?.data?.user ?? raw?.data ?? raw?.result?.user ?? raw?.result ?? raw?.user ?? raw;
      const name = pickName(profile);
      if (!name) {
        console.log(`VID ${user.vid}: no name from IVAO`);
        continue;
      }
      await prisma.user.update({ where: { id: user.id }, data: { name } });
      updated += 1;
      console.log(`VID ${user.vid}: updated to ${name}`);
    } catch (err) {
      console.log(`VID ${user.vid}: ${err.message}`);
    }
  }
  console.log(`Updated ${updated} users.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
