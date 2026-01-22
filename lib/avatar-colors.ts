export const AVATAR_COLOR_OPTIONS = [
  { key: "ivao-blue", label: "IVAO Blue", bg: "#0D2C99", text: "#F8FAFC" },
  { key: "ivao-light-blue", label: "Light Blue", bg: "#3C55AC", text: "#F8FAFC" },
  { key: "ivao-info-blue", label: "Info Blue", bg: "#7EA2D6", text: "#0F172A" },
  { key: "ivao-grey", label: "Grey", bg: "#D7D7DC", text: "#0F172A" },
  { key: "ivao-green", label: "Green", bg: "#2EC662", text: "#0F172A" },
  { key: "ivao-yellow", label: "Yellow", bg: "#F9CC2C", text: "#0F172A" },
  { key: "ivao-red", label: "Red", bg: "#E93434", text: "#F8FAFC" },
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
