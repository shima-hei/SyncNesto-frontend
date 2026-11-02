import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

export type AppliedTaskFilter = {
  key: string;
  label: string;
  onRemove: () => void;
};

export function TaskAppliedFilters({
  filters,
  hasUnappliedSearch,
  onReset,
}: {
  filters: AppliedTaskFilter[];
  hasUnappliedSearch: boolean;
  onReset: () => void;
}) {
  if (!filters.length && !hasUnappliedSearch) return null;
  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm"
      aria-live="polite"
    >
      {filters.map((filter) => (
        <Button
          key={filter.key}
          type="button"
          variant="outline"
          size="sm"
          className="h-auto max-w-full py-1"
          aria-label={`${filter.label}の条件を解除`}
          onClick={filter.onRemove}
        >
          <span className="min-w-0 whitespace-normal break-words text-left">
            {filter.label}
          </span>
          <XIcon data-icon="inline-end" />
        </Button>
      ))}
      {filters.length || hasUnappliedSearch ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          すべて解除
        </Button>
      ) : null}
      {hasUnappliedSearch ? (
        <p className="text-xs text-muted-foreground">
          入力したキーワードは「検索」で適用します。
        </p>
      ) : null}
    </div>
  );
}
