import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const Database = (await import("better-sqlite3")).default;

const SOURCE_ENV_KEYS = [
  "SOURCE_SQLITE_URL",
  "SOURCE_SQLITE_PATH",
  "SOURCE_DATABASE_URL",
  "DATABASE_URL_SOURCE",
];

const toSqlitePath = (value) => {
  if (!value) return null;
  let raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("file:")) {
    raw = raw.slice("file:".length);
  }
  const withoutQuery = raw.split("?")[0] ?? raw;
  return path.resolve(withoutQuery);
};

const getSourcePath = () => {
  for (const key of SOURCE_ENV_KEYS) {
    const candidate = toSqlitePath(process.env[key]);
    if (candidate) return candidate;
  }
  return null;
};

const sourcePath = getSourcePath();
if (!sourcePath) {
  throw new Error(
    "Missing source SQLite path. Set SOURCE_SQLITE_PATH or SOURCE_DATABASE_URL (file:...).",
  );
}
if (!fs.existsSync(sourcePath)) {
  throw new Error(`SQLite file not found: ${sourcePath}`);
}

const sqlite = new Database(sourcePath, { readonly: true });
const prisma = new PrismaClient();

const boolColumns = {
  User: ["publicStaffProfile"],
  Event: ["hqeAward", "isPublished"],
  AtcFrequency: ["restricted"],
  MenuItem: ["enabled"],
  IvaoStaffAssignment: ["onTrial", "active"],
};

const tablesInOrder = [
  { table: "User", model: "user" },
  { table: "Account", model: "account" },
  { table: "Session", model: "session" },
  { table: "VerificationToken", model: "verificationToken" },
  { table: "Fir", model: "fir" },
  { table: "Airport", model: "airport" },
  { table: "AtcFrequency", model: "atcFrequency" },
  { table: "Fix", model: "fix" },
  { table: "Vor", model: "vor" },
  { table: "Ndb", model: "ndb" },
  { table: "FrequencyBoundary", model: "frequencyBoundary" },
  { table: "FrequencyBoundaryPoint", model: "frequencyBoundaryPoint" },
  { table: "Stand", model: "stand" },
  { table: "Sid", model: "sid" },
  { table: "SidWaypoint", model: "sidWaypoint" },
  { table: "Star", model: "star" },
  { table: "StarWaypoint", model: "starWaypoint" },
  { table: "WeatherLog", model: "weatherLog" },
  { table: "Event", model: "event" },
  { table: "EventRegistration", model: "eventRegistration" },
  { table: "CalendarEvent", model: "calendarEvent" },
  { table: "CalendarSync", model: "calendarSync" },
  { table: "AnalyticsEvent", model: "analyticsEvent" },
  { table: "Menu", model: "menu" },
  { table: "MenuItem", model: "menuItem" },
  { table: "IvaoDepartment", model: "ivaoDepartment" },
  { table: "IvaoDepartmentTeam", model: "ivaoDepartmentTeam" },
  { table: "IvaoStaffPosition", model: "ivaoStaffPosition" },
  { table: "IvaoStaffAssignment", model: "ivaoStaffAssignment" },
  { table: "AuditLog", model: "auditLog" },
];

const tableExists = (table) => {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(table);
  return Boolean(row);
};

const readTable = (table) => {
  if (!tableExists(table)) return [];
  return sqlite.prepare(`SELECT * FROM "${table}"`).all();
};

const normalizeRow = (table, row) => {
  const normalized = { ...row };
  const bools = boolColumns[table] ?? [];
  for (const key of bools) {
    if (key in normalized) {
      normalized[key] = Boolean(normalized[key]);
    }
  }
  return normalized;
};

const chunk = (data, size = 500) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size));
  }
  return chunks;
};

const clearTarget = async () => {
  const joinTables = ["_EventAirports", "_EventFirs", "_UserFriends"];
  for (const join of joinTables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${join}"`);
    } catch {
      // Ignore missing join tables.
    }
  }

  const deleteOrder = [...tablesInOrder].reverse();
  for (const entry of deleteOrder) {
    await prisma[entry.model].deleteMany();
  }
};

const upsertJoinTable = async (table, leftIds, rightIds, connectFn) => {
  if (!tableExists(table)) return;
  const rows = readTable(table);
  if (!rows.length) return;
  const pairs = [];
  for (const row of rows) {
    const a = row.A;
    const b = row.B;
    if (leftIds.has(a) && rightIds.has(b)) {
      pairs.push({ left: a, right: b });
    } else if (leftIds.has(b) && rightIds.has(a)) {
      pairs.push({ left: b, right: a });
    }
  }
  if (pairs.length === 0) return;
  await connectFn(pairs);
};

const migrate = async () => {
  const shouldClear = process.env.CLEAR_TARGET === "1";
  const skipDuplicates = process.env.SKIP_DUPLICATES === "1";
  if (shouldClear) {
    await clearTarget();
  }

  for (const entry of tablesInOrder) {
    const rows = readTable(entry.table);
    if (!rows.length) continue;
    const normalized = rows.map((row) => normalizeRow(entry.table, row));
    const batches = chunk(normalized);
    for (const batch of batches) {
      await prisma[entry.model].createMany({ data: batch, skipDuplicates });
    }
  }

  const airportIds = new Set(readTable("Airport").map((row) => row.id));
  const eventIds = new Set(readTable("Event").map((row) => row.id));
  const firIds = new Set(readTable("Fir").map((row) => row.id));
  const userIds = new Set(readTable("User").map((row) => row.id));

  await upsertJoinTable("_EventAirports", airportIds, eventIds, async (pairs) => {
    const byEvent = new Map();
    for (const pair of pairs) {
      if (!byEvent.has(pair.right)) byEvent.set(pair.right, []);
      byEvent.get(pair.right).push(pair.left);
    }
    for (const [eventId, airportList] of byEvent.entries()) {
      await prisma.event.update({
        where: { id: eventId },
        data: { airports: { connect: airportList.map((id) => ({ id })) } },
      });
    }
  });

  await upsertJoinTable("_EventFirs", firIds, eventIds, async (pairs) => {
    const byEvent = new Map();
    for (const pair of pairs) {
      if (!byEvent.has(pair.right)) byEvent.set(pair.right, []);
      byEvent.get(pair.right).push(pair.left);
    }
    for (const [eventId, firList] of byEvent.entries()) {
      await prisma.event.update({
        where: { id: eventId },
        data: { firs: { connect: firList.map((id) => ({ id })) } },
      });
    }
  });

  if (tableExists("_UserFriends")) {
    const rows = readTable("_UserFriends");
    const seen = new Set();
    for (const row of rows) {
      const a = row.A;
      const b = row.B;
      if (!userIds.has(a) || !userIds.has(b)) continue;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [left, right] = a < b ? [a, b] : [b, a];
      await prisma.user.update({
        where: { id: left },
        data: { friends: { connect: { id: right } } },
      });
    }
  }
};

try {
  await migrate();
  console.log("Migration completed.");
} catch (error) {
  console.error("Migration failed.", error);
  process.exit(1);
} finally {
  sqlite.close();
  await prisma.$disconnect();
}
