import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function TaskFormActions({
  submitLabel = "変更を保存",
  isPending,
  disabled,
  onCancel,
  cancelDisabled,
}: {
  submitLabel?: string;
  isPending: boolean;
  disabled?: boolean;
  onCancel?: () => void;
  cancelDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
      {onCancel && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending || cancelDisabled}
          onClick={onCancel}
        >
          キャンセル
        </Button>
      )}
      <Button type="submit" size="sm" disabled={isPending || disabled}>
        {isPending && <Spinner data-icon="inline-start" />}
        {submitLabel}
      </Button>
    </div>
  );
}
