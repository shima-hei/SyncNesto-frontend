"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import type { TraceFacet } from "@/lib/api/generated/model";
import { readRequirementTraceDetailProjectsProjectIdRequirementTraceRequirementIdGet as readDetail } from "@/lib/api/generated/requirement-trace/requirement-trace";
import { withOverviewOrigin } from "@/lib/navigation/overview-origin";
import { VerificationEntry } from "@/features/requirement-verifications/components/verification-entry";
import { useRequirementAgreements } from "@/features/projects/hooks/use-requirement-agreements";
import {
  RequirementAgreements,
  AgreementRefresh,
} from "./requirement-agreements";

export function RequirementTracePanel({
  projectId,
  requirementId,
  version,
  returnTo,
  outsidePage,
}: {
  projectId: number;
  requirementId: number;
  version?: number;
  returnTo: string;
  outsidePage: boolean;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const query = useQuery({
    queryKey: [
      "requirement-trace-detail",
      tenant?.id,
      user?.id,
      projectId,
      requirementId,
      version,
    ],
    queryFn: () => readDetail(projectId, requirementId),
    enabled: Boolean(user && tenant),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const agreements = useRequirementAgreements(
    projectId,
    query.data && !query.isError ? [requirementId] : [],
  );
  const base = `/projects/joined/${projectId}`;
  const href = (path: string) => withOverviewOrigin(path, projectId, returnTo);
  if (query.isPending)
    return <Skeleton className="h-48" aria-label="選択した要件を読込中" />;
  if (query.isError || !query.data)
    return (
      <DataLoadError
        resourceName="選択した要件（権限・削除状態も確認してください）"
        onRetry={() => void query.refetch()}
      />
    );
  const row = query.data;
  const full = `${base}/requirements/${row.document_id}/items/${row.id}`;
  return (
    <div className="flex min-w-0 flex-col gap-6 px-4 pb-6">
      {outsidePage ? (
        <p className="text-sm text-muted-foreground">
          現在の一覧ページ外の要件を表示しています。選択を別の要件へ変更していません。
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {row.document_code} · {row.document_title} / 現在の要件版{" "}
          {row.version}
        </p>
        <h3 className="text-lg font-semibold break-words">
          {row.requirement_code} · {row.title}
        </h3>
        <Button variant="outline" size="sm" asChild className="self-start">
          <Link href={href(full)}>個別要件の詳細・全文を開く</Link>
        </Button>
      </div>
      <section aria-label="現在内容への合意" className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">この内容・版への判断</h4>
        <p className="text-xs text-muted-foreground">
          社内と外部の指定された人の判断を分けて確認できます。関係者全員の合意を示すものではありません。
        </p>
        <RequirementAgreements
          query={agreements}
          requirementId={row.id}
          version={row.version}
          projectId={projectId}
          returnTo={returnTo}
        />
        <AgreementRefresh
          query={agreements}
          onRefresh={() => void query.refetch()}
        />
      </section>
      <VerificationEntry
        projectId={projectId}
        requirementId={row.id}
        version={row.version}
        from={returnTo}
      />
      {(
        [
          ["description", "期待する振る舞い・要件の本文"],
          ["acceptance_criteria", "受け入れ条件"],
        ] as const
      ).map(([key, label]) => (
        <section key={key} aria-label={label} className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">{label}</h4>
          <MarkdownPreview
            className="min-h-0 break-words"
            value={row[key] ?? ""}
            emptyMessage="未登録です。個別要件で確認・追記できます。"
          />
          {row[`${key}_truncated`] ? (
            <p className="text-xs text-muted-foreground">
              長い本文の先頭を表示しています。続きは個別要件の全文で確認してください。
            </p>
          ) : null}
        </section>
      ))}
      <RelatedGroup
        label="関連設計"
        facet={row.designs}
        link={(id) => href(`${base}/specifications/${id}`)}
      />
      <RelatedGroup
        label="関連作業（Issue・マイルストーン等を含む）"
        facet={row.tasks}
        link={(id) => href(`${base}/tasks/${id}`)}
      />
      <RelatedGroup
        label="関連テスト項目"
        facet={row.test_items}
        link={(_, design) => href(`${base}/test-designs/${design}`)}
      />
      <section aria-label="判断の根拠" className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">合意と検証の根拠を確認する</h4>
        <p className="text-sm text-muted-foreground">
          関連の件数は、仕様への合意やテストの合格を示しません。判断対象の内容と実行時の内容を、それぞれの画面で確認できます。
        </p>
        {row.capabilities.read_approvals ? (
          <Button variant="outline" size="sm" asChild className="self-start">
            <Link
              href={href(
                `${base}/fixed-approvals?targetKind=requirement&sourceId=${row.id}`,
              )}
            >
              この要件の合意・承認の根拠を見る
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            合意・承認の閲覧権限が必要です。
          </p>
        )}
      </section>
    </div>
  );
}

function RelatedGroup({
  label,
  facet,
  link,
}: {
  label: string;
  facet: TraceFacet;
  link: (id: string, design?: number | null) => string;
}) {
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{label}</h4>
      {facet.state === "restricted" ? (
        <p className="text-sm text-muted-foreground">
          この分野の閲覧権限が必要です。
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {facet.count === 0
              ? "関連なし・必要かどうかは未判断です。"
              : `${facet.count}件の関連`}
          </p>
          <ul className="flex flex-col gap-2">
            {(facet.items ?? []).map((item) => (
              <li key={item.id}>
                <Link
                  className="block rounded-md border p-3 text-sm break-words hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  href={link(item.id, item.design_id)}
                >
                  <span className="font-medium">
                    {item.code} · {item.title || "名称未登録"}
                  </span>
                  {item.context_title ? (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.context_title} / 項目位置 {(item.position ?? 0) + 1}
                      （設計書を開きます）
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {facet.has_more ? (
            <p className="text-xs text-muted-foreground">
              先頭20件を表示しています。個別要件の詳細で続きを確認できます。
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
