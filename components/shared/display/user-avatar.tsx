import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRoundIcon } from "lucide-react";
import type { CSSProperties } from "react";

type UserAvatarProps = {
  name?: string | null;
  src?: string | null;
  size?: "default" | "sm" | "lg";
  decorative?: boolean;
};

export function UserAvatar({
  name,
  src,
  size = "default",
  decorative = false,
}: UserAvatarProps) {
  const fallback = getUserFallback(name);
  const hue = name?.trim()
    ? Array.from(name.trim().normalize("NFKC").toLowerCase()).reduce(
        (value, character) =>
          (value * 31 + (character.codePointAt(0) ?? 0)) % 360,
        0,
      )
    : undefined;

  return (
    <Avatar size={size} aria-hidden={decorative || undefined}>
      {src ? (
        <AvatarImage src={src} alt={decorative ? "" : (name ?? "ユーザー")} />
      ) : null}
      <AvatarFallback
        className={
          hue === undefined
            ? undefined
            : "user-avatar-tint text-[0.67rem] group-data-[size=lg]/avatar:text-xs"
        }
        style={
          hue === undefined
            ? undefined
            : ({ "--user-avatar-hue": hue } as CSSProperties)
        }
      >
        {fallback ?? <UserRoundIcon aria-hidden="true" className="size-1/2" />}
      </AvatarFallback>
    </Avatar>
  );
}

const getUserFallback = (name?: string | null) => {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return null;
  }

  const normalized = trimmedName.normalize("NFKC");
  return Array.from(normalized)
    .slice(0, /^[a-z]/i.test(normalized) ? 2 : 1)
    .join("")
    .toUpperCase();
};

export function UserDisplay({
  name,
  src,
  size = "sm",
  emptyLabel = "未割り当て",
  truncate = false,
}: UserAvatarProps & { emptyLabel?: string; truncate?: boolean }) {
  const label = name?.trim() || emptyLabel;
  return (
    <span
      className="inline-flex max-w-full min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]"
      title={truncate ? label : undefined}
    >
      <UserAvatar name={name} src={src} size={size} decorative />
      <span className={truncate ? "min-w-0 truncate" : "min-w-0"}>{label}</span>
    </span>
  );
}
