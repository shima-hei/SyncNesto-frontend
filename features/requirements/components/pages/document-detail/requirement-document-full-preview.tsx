"use client";

import { useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { objectiveFieldLabels } from "@/features/projects/components/shared/project-objective-fields";
import { listRequirementsProjectsProjectIdRequirementsGet } from "@/lib/api/generated/requirements/requirements";
import type { RequirementDocumentRead } from "@/lib/api/generated/model";
import { useSectionEdits } from "../../../hooks/use-section-edits";
import { useRequirementSections } from "../../../hooks/use-requirement-sections";
import {
  composeDocumentPreview,
  isDocumentPreviewComplete,
} from "../../../lib/document-full-preview";
import {
  getRequirementDocumentStatusLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../../constants/requirement-options";

import {
  documentPreviewSourceSearch,
  type PreviewSource,
} from "../../../lib/document-preview-navigation";

export function RequirementDocumentFullPreview({
  projectId,
  document,
  onReturn,
}: {
  projectId: number;
  document: RequirementDocumentRead;
  onReturn: (source?: PreviewSource) => void;
}) {
  const toggleId = useId();
  const search = useSearchParams();
  const [includeUnsaved, setIncludeUnsaved] = useState(false);
  const { scope, edits, unsaved } = useSectionEdits(projectId, document.id);
  const sectionsQuery = useRequirementSections(projectId, document.id);
  const query = useInfiniteQuery({
    queryKey: [
      "requirement-document-full-preview",
      scope,
      projectId,
      document.id,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listRequirementsProjectsProjectIdRequirementsGet(projectId, {
        page: pageParam,
        page_size: 100,
        document_id: document.id,
        sort: "code_asc",
      }),
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    retry: false,
  });
  const { hasNextPage, isFetching, error, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetching && !error) void fetchNextPage();
  }, [hasNextPage, isFetching, error, fetchNextPage]);
  const requirements = query.data?.pages.flatMap((page) => page.items) ?? [];
  const { groups, warnings } = composeDocumentPreview(
    sectionsQuery.sections,
    requirements,
    edits,
    includeUnsaved,
  );
  const loading = sectionsQuery.isLoading || query.isPending || hasNextPage;
  const failed = Boolean(sectionsQuery.error || error);
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <div
      id="full-document-preview"
      className="@container/full-preview flex min-w-0 flex-col gap-4 scroll-mt-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">全文プレビュー</h2>
          <Badge variant="secondary">編集内容の確認</Badge>
          <span className="text-sm" role="status">
            {includeUnsaved
              ? `未保存の章本文を含む（${unsaved.length}件）`
              : "保存済み内容"}
          </span>
        </div>
        <Button type="button" variant="outline" onClick={() => onReturn()}>
          編集へ戻る
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        現在の文書・章・要件を確認する表示です。正式承認・固定版の作成・顧客公開は別の操作です。
        ファイル出力とは表示内容・並び順が異なる場合があります。
      </p>
      <Field orientation="horizontal" className="w-fit">
        <Checkbox
          id={toggleId}
          checked={includeUnsaved}
          onCheckedChange={(value) => setIncludeUnsaved(value === true)}
        />
        <FieldLabel htmlFor={toggleId}>
          このタブの未保存の章本文を含める
        </FieldLabel>
      </Field>
      <p className="text-xs text-muted-foreground">
        切替による保存・承認・公開は行いません。文書情報・個別要件の別フォームで入力中の内容は含みません。
      </p>
      {warnings.length ? (
        <Alert>
          <AlertTitle>編集中の章を確認してください</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-2">
              {warnings.map((warning) => (
                <li key={warning.id}>
                  {warning.title}：{warning.message}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => onReturn({ sectionId: warning.id })}
                  >
                    入力を確認
                  </Button>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {failed ? (
        <DataLoadError
          resourceName="全文プレビュー"
          isRetrying={isFetching}
          onRetry={() => {
            if (sectionsQuery.error) void sectionsQuery.refetch();
            if (query.isFetchNextPageError) void fetchNextPage();
            else if (error) void query.refetch();
          }}
        />
      ) : loading ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-sm">
            全文を読み込み中… 要件{requirements.length} / {total}件
          </p>
          <Skeleton className="h-28 w-full" />
        </div>
      ) : !isDocumentPreviewComplete(requirements, total, document.id) ? (
        <DataLoadError
          resourceName="全件揃った要件（取得中に変更された可能性があります）"
          isRetrying={isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <div className="grid min-w-0 gap-6 @min-[64rem]/full-preview:grid-cols-[14rem_minmax(0,1fr)] @min-[64rem]/full-preview:items-start">
          <nav
            aria-label="全文プレビューの目次"
            className="min-w-0 @min-[64rem]/full-preview:sticky @min-[64rem]/full-preview:top-20 @min-[64rem]/full-preview:max-h-[calc(100dvh-6rem)] @min-[64rem]/full-preview:overflow-y-auto"
          >
            <p className="mb-2 text-sm font-medium">目次</p>
            <ul className="flex flex-col gap-2 text-sm">
              {groups.map((group) => (
                <li key={group.id ?? "unassigned"} className="min-w-0">
                  <a
                    className="break-words underline underline-offset-4"
                    href={`#full-preview-section-${group.id ?? "unassigned"}`}
                  >
                    {group.title}
                  </a>
                  <Button
                    className="ml-1"
                    type="button"
                    variant="link"
                    size="sm"
                    aria-label={`${group.title}の編集へ戻る`}
                    onClick={() => onReturn({ sectionId: group.id })}
                  >
                    元の章へ
                  </Button>
                  {group.unsaved ? (
                    <Badge variant="outline">未保存</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              全{requirements.length}件の要件を読込済み
            </p>
          </nav>
          <article
            aria-label="全文プレビュー本文"
            className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-8 rounded-lg border bg-background px-4 py-6 break-words @min-[40rem]/full-preview:px-8"
          >
            <header className="flex flex-col gap-2 border-b pb-6">
              <p className="text-sm text-muted-foreground">
                {document.document_code} / 文書情報の版 {document.version}
              </p>
              <h2 className="text-2xl font-semibold">{document.title}</h2>
              <p className="text-sm">
                {getRequirementDocumentStatusLabel(document.status)}
              </p>
            </header>
            <PreviewText title="目的" value={document.purpose} />
            {Object.entries(objectiveFieldLabels).map(([field, label]) => {
              const value =
                document[field as keyof typeof objectiveFieldLabels];
              return value ? (
                <PreviewText key={field} title={label} value={value} />
              ) : null;
            })}
            {groups.map((group) => (
              <section
                key={group.id ?? "unassigned"}
                id={`full-preview-section-${group.id ?? "unassigned"}`}
                className="flex min-w-0 scroll-mt-24 flex-col gap-4"
              >
                <h3 className="border-b pb-2 text-xl font-semibold">
                  {group.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {group.id ? `章の保存済み版 ${group.version}` : "章未所属"}
                  {group.unsaved ? "・未保存の本文を表示" : ""}
                </p>
                <MarkdownPreview
                  value={group.content}
                  emptyMessage={
                    group.id
                      ? "章本文は未記入です。"
                      : "この要件は章に所属していません。"
                  }
                  className="min-h-0 border-0 bg-transparent p-0"
                />
                {group.requirements.map((requirement) => (
                  <section
                    key={requirement.id}
                    className="flex min-w-0 flex-col gap-3 border-t pt-4"
                  >
                    <h4 className="text-base font-semibold">
                      <a
                        href={`?${documentPreviewSourceSearch(search.toString(), { sectionId: group.id, requirementId: requirement.id })}`}
                        className="underline underline-offset-4"
                        aria-label={`${requirement.requirement_code}を元の章で確認`}
                        onClick={(event) => {
                          if (
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          )
                            return;
                          event.preventDefault();
                          onReturn({
                            sectionId: group.id,
                            requirementId: requirement.id,
                          });
                        }}
                      >
                        {requirement.requirement_code} {requirement.title}
                      </a>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      要件の版 {requirement.version}・
                      {getRequirementTypeLabel(requirement.requirement_type)}・
                      {getRequirementStatusLabel(requirement.status)}
                    </p>
                    <PreviewText
                      title="説明"
                      value={requirement.description}
                      level="requirement"
                    />
                    <PreviewText
                      title="理由"
                      value={requirement.rationale}
                      level="requirement"
                    />
                    <PreviewText
                      title="受け入れ条件"
                      value={requirement.acceptance_criteria}
                      level="requirement"
                    />
                  </section>
                ))}
                {!group.requirements.length ? (
                  <p className="text-sm text-muted-foreground">
                    この章の個別要件はありません。
                  </p>
                ) : null}
              </section>
            ))}
            {!groups.length ? (
              <p className="text-sm text-muted-foreground">
                章・個別要件はまだありません。
              </p>
            ) : null}
          </article>
        </div>
      )}
    </div>
  );
}

function PreviewText({
  title,
  value,
  level = "document",
}: {
  title: string;
  value?: string | null;
  level?: "document" | "requirement";
}) {
  const Heading = level === "requirement" ? "h5" : "h3";
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Heading className="text-sm font-medium">{title}</Heading>
      <MarkdownPreview
        value={value ?? ""}
        emptyMessage="未記入です。"
        className="min-h-0 border-0 bg-transparent p-0"
      />
    </section>
  );
}
