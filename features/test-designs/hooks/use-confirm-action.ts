import { useCallback, useState } from "react";
import { toast } from "sonner";

type Confirmation = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function useConfirmAction() {
  const [pending, setPending] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useCallback((action: Confirmation) => setPending(action), []);

  return {
    confirm,
    confirmDialogProps: {
      open: pending !== null,
      onOpenChange: (open: boolean) => {
        if (!open && !busy) setPending(null);
      },
      title: pending?.title ?? "確認",
      description: pending?.description ?? "",
      confirmLabel: pending?.confirmLabel,
      cancelLabel: pending?.cancelLabel,
      destructive: pending?.destructive,
      isPending: busy,
      onConfirm: async () => {
        if (!pending || busy) return;
        setBusy(true);
        try {
          await pending.onConfirm();
          setPending(null);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "操作できませんでした",
          );
        } finally {
          setBusy(false);
        }
      },
    },
  };
}
