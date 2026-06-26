"use client";

import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RequirementDocumentRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format/date";

import {
  getRequirementDocumentStatusLabel,
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
  getRequirementTypeLabel,
} from "../../../constants/requirement-options";
import { useRequirementSections } from "../../../hooks/use-requirement-sections";
import { useRequirements } from "../../../hooks/use-requirements";
import { RequirementTargetCommentsSection } from "../../sections/requirement-target-comments-section";

type RequirementDocumentOverviewProps = {
  projectId: number;
  documentId: number;
  document: RequirementDocumentRead;
  canComment: boolean;
};

export function RequirementDocumentOverview({
  projectId,
  documentId,
  document,
  canComment,
}: RequirementDocumentOverviewProps) {
  const { sections, isLoading: isSectionsLoading } = useRequirementSections(
    projectId,
    documentId
  );
  const { requirements, isLoading: isRequirementsLoading } = useRequirements(
    projectId,
    {
      page: 1,
      page_size: 100,
      document_id: documentId,
    }
  );
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const unassignedRequirements = requirements.filter(
    (requirement) => !requirement.section_id
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DocumentInfo
            label="ステータス"
            value={
              document.status
                ? getRequirementDocumentStatusLabel(document.status)
                : "-"
            }
          />
          <DocumentInfo
            label="対象システム"
            value={document.target_system_name ?? "-"}
          />
          <DocumentInfo label="クライアント" value={document.client_name ?? "-"} />
          <DocumentInfo label="ベンダー" value={document.vendor_name ?? "-"} />
          <DocumentInfo
            label="更新日時"
            value={formatDateTime(document.updated_at)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle>要件定義書プレビュー</CardTitle>
          </CardHeader>
          <CardContent>
            {isSectionsLoading || isRequirementsLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <article className="mx-auto flex max-w-4xl flex-col gap-8 rounded-lg border bg-background px-6 py-8 md:px-10">
                <header className="flex flex-col gap-4 border-b pb-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      {document.document_code}
                    </p>
                    <h1 className="text-2xl font-semibold tracking-normal">
                      {document.title}
                    </h1>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                    <DocumentMeta
                      label="ステータス"
                      value={
                        document.status
                          ? getRequirementDocumentStatusLabel(document.status)
                          : "-"
                      }
                    />
                    <DocumentMeta
                      label="対象システム"
                      value={document.target_system_name ?? "-"}
                    />
                    <DocumentMeta
                      label="クライアント"
                      value={document.client_name ?? "-"}
                    />
                    <DocumentMeta
                      label="ベンダー"
                      value={document.vendor_name ?? "-"}
                    />
                    <DocumentMeta
                      label="更新日時"
                      value={formatDateTime(document.updated_at)}
                    />
                  </dl>
                </header>

                <section className="flex flex-col gap-3">
                  <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">
                    目的
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {document.purpose || "目的は未設定です。"}
                  </p>
                </section>

                {sortedSections.map((section) => (
                  <DocumentPreviewSection
                    key={section.id}
                    title={section.title}
                    content={section.content ?? ""}
                    requirements={requirements.filter(
                      (requirement) => requirement.section_id === section.id
                    )}
                  />
                ))}
                {unassignedRequirements.length ? (
                  <DocumentPreviewSection
                    title="セクション未設定"
                    content=""
                    requirements={unassignedRequirements}
                  />
                ) : null}
                {!sortedSections.length && !unassignedRequirements.length ? (
                  <p className="text-sm text-muted-foreground">
                    プレビューするセクションまたは要件はありません。
                  </p>
                ) : null}
              </article>
            )}
          </CardContent>
        </Card>

        <aside className="min-w-0 xl:sticky xl:top-20">
          <RequirementTargetCommentsSection
            projectId={projectId}
            targetType="document"
            targetId={documentId}
            title="要件定義書コメント"
            canComment={canComment}
            className="xl:max-h-[calc(100vh-6rem)] xl:overflow-hidden"
            contentClassName="xl:min-h-0 xl:overflow-y-auto"
          />
        </aside>
      </div>
    </div>
  );
}

type DocumentPreviewSectionProps = {
  title: string;
  content: string;
  requirements: {
    id: number;
    requirement_code: string;
    title: string;
    requirement_type?: string | null;
    priority?: string | null;
    status?: string | null;
  }[];
};

function DocumentPreviewSection({
  title,
  content,
  requirements,
}: DocumentPreviewSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">
        {title}
      </h2>
      {content.trim() ? (
        <MarkdownPreview
          value={content}
          emptyMessage="本文はありません。"
          className="min-h-0 border-0 bg-transparent p-0"
        />
      ) : null}
      {requirements.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">要件一覧</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>要件ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((requirement) => (
                <TableRow key={requirement.id}>
                  <TableCell className="font-medium">
                    {requirement.requirement_code}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {requirement.title}
                  </TableCell>
                  <TableCell>
                    {getRequirementTypeLabel(requirement.requirement_type)}
                  </TableCell>
                  <TableCell>
                    {getRequirementPriorityLabel(requirement.priority)}
                  </TableCell>
                  <TableCell>
                    {getRequirementStatusLabel(requirement.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : content.trim() ? null : (
        <p className="text-sm text-muted-foreground">
          本文と要件はありません。
        </p>
      )}
    </section>
  );
}

function DocumentMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function DocumentInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
