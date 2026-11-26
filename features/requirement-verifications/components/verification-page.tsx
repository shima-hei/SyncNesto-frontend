"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { getPlan } from "../lib/api";
import { safeVerificationOrigin } from "../lib/navigation";
import { VerificationEditor } from "./verification-editor";
import { VerificationSummary } from "./verification-summary";

export function VerificationPage({
  projectId,
  planId,
  embedded = false,
  from,
}: {
  projectId: number;
  planId: string;
  embedded?: boolean;
  from?: string;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useSearchParams();
  const detail = useRef<HTMLDetailsElement>(null);
  const [opened, setOpened] = useState(false);
  const key = ["verification-plan", tenant?.id, user?.id, projectId, planId];
  const query = useQuery({
    queryKey: key,
    queryFn: () => getPlan(projectId, planId),
    enabled: Boolean(user && tenant),
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isPending)
    return <Skeleton className="h-64" aria-label="固定要件と確認表を読込中" />;
  if (query.isError || !query.data)
    return (
      <DataLoadError
        resourceName="固定要件の確認表（権限・利用状態も確認してください）"
        onRetry={() => void query.refetch()}
      />
    );
  const editor = (
    <VerificationEditor
      key={`${tenant?.id}:${user?.id}:${planId}:${query.data.current_version}`}
      row={query.data}
      projectId={projectId}
      from={from ?? safeVerificationOrigin(params.get("from"), projectId)}
      embedded={embedded}
      queryKey={key}
      userId={user?.id}
      tenantId={tenant?.id}
    />
  );
  if (!embedded) return editor;
  return (
    <div className="space-y-4">
      <VerificationSummary
        projectId={projectId}
        plan={query.data}
        tenantId={tenant?.id}
        userId={user?.id}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          確認項目とテスト結果・証跡を結び付けて判断します。
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setOpened(true);
            if (detail.current) detail.current.open = true;
            requestAnimationFrame(() => {
              const judgment = detail.current?.querySelector<HTMLElement>(
                "[data-verification-final-judgment]",
              );
              judgment?.focus();
            });
          }}
        >
          合否判定へ
        </Button>
      </div>
      <details
        ref={detail}
        className="min-w-0 rounded-lg border"
        onToggle={(event) => {
          if (event.currentTarget.open) setOpened(true);
        }}
      >
        <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium">
          確認表を編集・テスト結果と証跡を見る
        </summary>
        {opened ? <div className="min-w-0 border-t p-3">{editor}</div> : null}
      </details>
    </div>
  );
}
