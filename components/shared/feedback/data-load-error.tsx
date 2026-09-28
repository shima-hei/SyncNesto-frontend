"use client";

import { Button } from "@/components/ui/button";

export function DataLoadError({
  resourceName,
  onRetry,
  isRetrying = false,
}: {
  resourceName: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-y py-4 text-sm"
    >
      <p>{resourceName}を取得できませんでした。通信状態を確認してください。</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRetrying}
        onClick={onRetry}
      >
        再試行
      </Button>
    </div>
  );
}
