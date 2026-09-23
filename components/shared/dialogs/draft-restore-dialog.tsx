"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DraftRestoreDialogProps = {
  open: boolean;
  updatedAt?: string;
  onRestore: () => void;
  onDiscard: () => void;
};

export function DraftRestoreDialog({
  open,
  updatedAt,
  onRestore,
  onDiscard,
}: DraftRestoreDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存済みの下書き</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {updatedAt
            ? `${new Date(updatedAt).toLocaleString()} に保存された下書きがあります。`
            : "保存された下書きがあります。"}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDiscard}>
            破棄
          </Button>
          <Button type="button" onClick={onRestore}>
            復元
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
