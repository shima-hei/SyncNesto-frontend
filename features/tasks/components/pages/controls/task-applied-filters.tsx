import { Button } from "@/components/ui/button";

export function TaskAppliedFilters({
  filters,
  hasUnappliedSearch,
  onReset,
}: {
  filters: string[];
  hasUnappliedSearch: boolean;
  onReset: () => void;
}) {
  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm"
      aria-live="polite"
    >
      <p className="min-w-0 break-words text-muted-foreground">
        {filters.length
          ? `適用中: ${filters.join(" ／ ")}`
          : "検索・絞り込み条件なし"}
      </p>
      {filters.length || hasUnappliedSearch ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          条件を解除
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
