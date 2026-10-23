"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { getPlan } from "../lib/api";
import { safeVerificationOrigin } from "../lib/navigation";
import { VerificationEditor } from "./verification-editor";

export function VerificationPage({
  projectId,
  planId,
}: {
  projectId: number;
  planId: string;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const params = useSearchParams();
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
  return (
    <VerificationEditor
      key={`${tenant?.id}:${user?.id}:${planId}:${query.data.current_version}`}
      row={query.data}
      projectId={projectId}
      from={safeVerificationOrigin(params.get("from"), projectId)}
      queryKey={key}
      userId={user?.id}
      tenantId={tenant?.id}
    />
  );
}
