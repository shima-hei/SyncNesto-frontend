"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function TaskReturnReasonDialog({
  title,
  initialReason,
  onDone,
}: {
  title: string;
  initialReason: string;
  onDone: (reason: string | null) => void;
}) {
  const id = useId();
  const [reason, setReason] = useState(initialReason);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDone(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>タスクを差し戻す</DialogTitle>
          <DialogDescription>
            「{title}
            」の修正が必要な内容を入力してください。担当者に通知します。
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim()) onDone(reason.trim());
          }}
        >
          <Field>
            <FieldLabel htmlFor={id}>差し戻し理由</FieldLabel>
            <Textarea
              id={id}
              required
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onDone(null)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!reason.trim()}>
              差し戻す
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
