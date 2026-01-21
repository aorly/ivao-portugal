export const AVATAR_COLOR_OPTIONS = [
  { key: "ivao-blue", label: "IVAO Blue", bg: "#1d4ed8", text: "#f8fafc" },
  { key: "ivao-sky", label: "Atlantic Sky", bg: "#0ea5e9", text: "#f0f9ff" },
  { key: "ivao-indigo", label: "Deep Indigo", bg: "#4338ca", text: "#eef2ff" },
  { key: "ivao-navy", label: "Navy", bg: "#0f172a", text: "#f8fafc" },
  { key: "ivao-teal", label: "Teal", bg: "#0f766e", text: "#f0fdfa" },
  { key: "ivao-amber", label: "Amber", bg: "#f59e0b", text: "#111827" },
  { key: "ivao-rose", label: "Rose", bg: "#e11d48", text: "#fff1f2" },
] as const;

export type AvatarColorKey = (typeof AVATAR_COLOR_OPTIONS)[number]["key"];
export type AvatarColorOption = (typeof AVATAR_COLOR_OPTIONS)[number];

const colorMap = new Map<string, AvatarColorOption>(
  AVATAR_COLOR_OPTIONS.map((option) => [option.key, option]),
);

const hashName = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getAvatarColor = (key?: string | null, fallbackName?: string) => {
  if (key && colorMap.has(key)) {
    return colorMap.get(key)!;
  }
  const name = fallbackName?.trim() || "IVAO";
  const idx = hashName(name) % AVATAR_COLOR_OPTIONS.length;
  return AVATAR_COLOR_OPTIONS[idx];
};
