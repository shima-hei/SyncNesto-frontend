"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import type { ArtifactPreview } from "@/lib/api/generated/model";
import {
  previewRelease,
  createRelease,
  readNodes,
} from "@/features/artifact-releases/lib/api";
import { listPlans, createPlan } from "../lib/api";
import { verificationHref } from "../lib/navigation";

export function VerificationEntry({
  projectId,
  requirementId,
  version,
  from,
}: {
  projectId: number;
  requirementId: number;
  version: number;
  from?: string;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const origin = from ?? `${pathname}${params.size ? `?${params}` : ""}`;
  const [cursor, setCursor] = useState<string | undefined>();
  const [preview, setPreview] = useState<ArtifactPreview | null>(null);
  const request = useRef<{ artifact: string; plan: string } | null>(null);
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
  const prepare = useMutation({
    mutationFn: () =>
      previewRelease(projectId, {
        source: { kind: "requirement", id: requirementId, version },
        included_sources: [],
      }),
    onSuccess: (value) => {
      request.current = {
        artifact: crypto.randomUUID(),
        plan: crypto.randomUUID(),
      };
      setPreview(value);
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!preview || !request.current)
        throw new Error("固定する内容を確認してください");
      const release = await createRelease(projectId, {
        source: preview.source,
        included_sources: [],
        projection_version: preview.projection_version,
        expected_scope_digest: preview.scope_digest,
        request_id: request.current.artifact,
      });
      const nodes = await readNodes(projectId, release.id, { page_size: 1 });
      const node = nodes.items.find(
        (item) =>
          item.node_kind === "requirement" && item.source_id === requirementId,
      );
      if (!node)
        throw new Error(
          "固定した要件を取得できませんでした。再試行してください",
        );
      return createPlan(projectId, {
        source_requirement_id: requirementId,
        release_id: release.id,
        target_node_id: node.id,
        expected_release_digest: release.content_digest,
        request_id: request.current.plan,
      });
    },
    onSuccess: (plan) =>
      router.push(verificationHref(projectId, plan.id, origin)),
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
  if (!query.data.enabled) return null;
  if (query.data.state === "restricted")
    return (
      <Alert>
        <AlertTitle>確認表を閲覧できません</AlertTitle>
        <AlertDescription>
          要件とテストの閲覧権限を確認してください。
        </AlertDescription>
      </Alert>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>要件を確かめる準備</CardTitle>
        <CardDescription>
          固定した要件に確認項目を結び付けます。確認表の保存は要件の合格判定にはなりません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(query.data.items ?? []).map((plan) => (
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
        ))}
        {!query.data.items?.length ? (
          <p className="text-sm text-muted-foreground">
            確認表はまだありません。必要な項目から追加できます。
          </p>
        ) : null}
        {query.data.next_cursor ? (
          <Button
            variant="ghost"
            onClick={() => setCursor(query.data.next_cursor ?? undefined)}
          >
            次の確認表
          </Button>
        ) : cursor ? (
          <Button variant="ghost" onClick={() => setCursor(undefined)}>
            最初の確認表へ
          </Button>
        ) : null}
        {query.data.can_prepare ? (
          <Button
            className="self-start"
            disabled={prepare.isPending}
            onClick={() => prepare.mutate()}
          >
            現在の内容から確認表を作る
          </Button>
        ) : null}
        <FormApiError error={prepare.error} />
      </CardContent>
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!create.isPending && !open) setPreview(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この要件を固定して確認表を作成</DialogTitle>
            <DialogDescription>
              「{preview?.title}」の要件版 {preview?.source.version}{" "}
              を保存します。後から要件を編集しても、この確認表の対象は変わりません。
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            最初は確認項目0件で作成し、必要な確認方法を後から追加します。
          </p>
          <FormApiError error={create.error} />
          <DialogFooter>
            <Button
              variant="outline"
              disabled={create.isPending}
              onClick={() => setPreview(null)}
            >
              戻る
            </Button>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "作成中…" : "固定して作成する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
