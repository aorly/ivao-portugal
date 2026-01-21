import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { getAvatarColor } from "@/lib/avatar-colors";

type UserAvatarProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  src?: string | null;
  colorKey?: string | null;
  size?: number;
};

const initialsFor = (name: string) => {
  const parts = name.trim().split(/\s+/g).filter(Boolean);
  if (parts.length === 0) return "IV";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "IV";
};

export function UserAvatar({ name, src, colorKey, size = 40, className, ...props }: UserAvatarProps) {
  const palette = getAvatarColor(colorKey, name);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-full text-sm font-semibold",
        className,
      )}
      style={{ width: size, height: size, backgroundColor: palette.bg, color: palette.text }}
      aria-label={name}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{initialsFor(name)}</span>
      )}
    </div>
  );
}
