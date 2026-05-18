"use client";

import { useState } from "react";
import { CameraIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { CurrentUserRead } from "@/lib/api/generated/model";

import { AvatarUploadDialog } from "./avatar-upload-dialog";

type AccountAvatarSectionProps = {
  user: CurrentUserRead;
};

export function AccountAvatarSection({ user }: AccountAvatarSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => setOpen(true)}
          aria-label="アイコン画像を変更"
        >
          <UserAvatar name={user.name} src={user.avatar_url} size="lg" />
        </button>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-sm text-muted-foreground">
            {user.email}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 w-fit"
            onClick={() => setOpen(true)}
          >
            <CameraIcon data-icon="inline-start" />
            アイコン変更
          </Button>
        </div>
      </div>
      <AvatarUploadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

