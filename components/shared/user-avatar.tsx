import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

type UserAvatarProps = {
  name?: string | null;
  src?: string | null;
  size?: "default" | "sm" | "lg";
};

export function UserAvatar({
  name,
  src,
  size = "default",
}: UserAvatarProps) {
  const fallback = getUserFallback(name);

  return (
    <Avatar size={size}>
      {src ? <AvatarImage src={src} alt={name ?? "ユーザー"} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}

const getUserFallback = (name?: string | null) => {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return "U";
  }

  return trimmedName.slice(0, 2).toUpperCase();
};
