"use client";

import { ConfirmDialog } from "./confirm-dialog";

type ResourceDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceName: string;
  description?: string;
  isPending?: boolean;
  onConfirm: () => Promise<void> | void;
};

export function ResourceDeleteDialog({
  open,
  onOpenChange,
  resourceName,
  description,
  isPending = false,
  onConfirm,
}: ResourceDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${resourceName}を削除しますか`}
      description={
        description ??
        "削除すると元に戻せません。内容を確認してから実行してください。"
      }
      confirmLabel="削除"
      destructive
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
