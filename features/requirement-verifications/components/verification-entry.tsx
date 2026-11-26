"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { listPlans } from "../lib/api";
import { VerificationPreparation } from "./verification-preparation";
import { verificationHref } from "../lib/navigation";
const VerificationPage = dynamic(() =>
  import("./verification-page").then((module) => module.VerificationPage),
);

export function VerificationEntry({
  projectId,
  requirementId,
  version,
  from,
  embedded = false,
}: {
  projectId: number;
  requirementId: number;
  version: number;
  from?: string;
  embedded?: boolean;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const origin = from ?? `${pathname}${params.size ? `?${params}` : ""}`;
  const [cursor, setCursor] = useState<string | undefined>();
  const [selectedPlan, setSelectedPlan] = useState<string>();
  const cache = useQueryClient();
  const [preparing, setPreparing] = useState(false);
  const enabled = Boolean(
    user?.user_type === "internal" && !user.demo && tenant,
  );
  const query = useQuery({
    queryKey: [
      "verification-plans",
      tenant?.id,
      user?.id,
      projectId,
      requirementId,
      version,
      cursor,
    ],
    queryFn: () =>
      listPlans(projectId, { requirement_id: requirementId, cursor }),
    enabled,
    retry: false,
  });
  if (!enabled) return null;
  if (query.isPending)
    return <Skeleton className="h-20" aria-label="確認表を読込中" />;
  if (query.isError)
    return (
      <DataLoadError
        resourceName="要件の確認表"
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data.enabled)
    return embedded ? (
      <p className="text-sm text-muted-foreground">
        この案件では要件の検証を利用できません。
      </p>
    ) : null;
  if (query.data.state === "restricted")
    return (
      <Alert>
        <AlertTitle>確認表を閲覧できません</AlertTitle>
        <AlertDescription>
          要件とテストの閲覧権限を確認してください。
        </AlertDescription>
      </Alert>
    );
  const planId = selectedPlan ?? query.data.items?.[0]?.id;
  const showPreparation = query.data.can_prepare && (preparing || !planId);
  return (
    <Card
      className={
        embedded
          ? "gap-3 overflow-visible rounded-none border-t bg-transparent py-3 ring-0"
          : undefined
      }
    >
      {!embedded || !showPreparation ? (
        <CardHeader className={embedded ? "px-0" : undefined}>
          <CardTitle>確認表</CardTitle>
          {!embedded ? (
            <CardDescription>
              検証対象、確認項目、証跡を管理します。
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent
        className={
          embedded ? "flex flex-col gap-3 px-0" : "flex flex-col gap-3"
        }
      >
        {embedded && (query.data.items?.length ?? 0) > 1 ? (
          <label className="grid gap-2 text-sm">
            確認表を選択
            <select
              value={planId}
              onChange={(event) => setSelectedPlan(event.currentTarget.value)}
              className="min-w-0 rounded-md border bg-background px-2 py-1.5"
            >
              {query.data.items?.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} ・ {plan.current_version}版
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {!embedded
          ? (query.data.items ?? []).map((plan) => (
              <Button
                key={plan.id}
                variant="outline"
                asChild
                className="h-auto justify-start whitespace-normal"
              >
                <Link href={verificationHref(projectId, plan.id, origin)}>
                  {plan.title} · 確認表 {plan.current_version}版
                </Link>
              </Button>
            ))
          : null}
        {!showPreparation && !query.data.items?.length ? (
          <p className="text-sm text-muted-foreground">
            確認表はまだありません。必要な項目から追加できます。
          </p>
        ) : null}
        {query.data.next_cursor ? (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedPlan(undefined);
              setCursor(query.data.next_cursor ?? undefined);
            }}
          >
            次の確認表
          </Button>
        ) : cursor ? (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedPlan(undefined);
              setCursor(undefined);
            }}
          >
            最初の確認表へ
          </Button>
        ) : null}
        {query.data.can_prepare && planId ? (
          <Button
            className="self-start"
            variant="outline"
            size="sm"
            onClick={() => setPreparing(!preparing)}
          >
            {preparing ? "確認表へ戻る" : "新しい検証を準備"}
          </Button>
        ) : null}
        {showPreparation ? (
          <VerificationPreparation
            key={requirementId}
            projectId={projectId}
            requirementId={requirementId}
            version={version}
            onStart={(plan) => {
              setSelectedPlan(plan.id);
              setPreparing(false);
              setCursor(undefined);
              void cache.invalidateQueries({
                queryKey: [
                  "verification-plans",
                  tenant?.id,
                  user?.id,
                  projectId,
                  requirementId,
                ],
              });
              if (!embedded)
                router.push(verificationHref(projectId, plan.id, origin));
            }}
          />
        ) : null}
      </CardContent>
      {embedded && planId && !showPreparation ? (
        <CardContent className="px-0">
          <VerificationPage
            key={planId}
            projectId={projectId}
            planId={planId}
            from={origin}
            embedded
          />
        </CardContent>
      ) : null}
    </Card>
  );
}
