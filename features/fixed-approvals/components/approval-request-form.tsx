"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import type {
  FixedApprovalPreview,
  FixedApprovalScopeInput,
  LegacyApprovalPreview,
} from "@/lib/api/generated/model";
import {
  allBasis,
  allReleaseNodes,
  readRelease,
  listPreservations,
  listCandidates,
  previewApproval,
  createApproval,
  previewMigration,
  migrateApproval,
  readImport,
} from "../lib/api";
import { approvalPath, basisLabels, textValue } from "../lib/display";
import { ChoiceField } from "./choice-field";
import { useApprovalDraftGuard } from "../hooks/use-approval-draft-guard";

export function ApprovalRequestForm({
  projectId,
  releaseId,
  legacyId,
  originImport,
}: {
  projectId: number;
  releaseId: string;
  legacyId?: number;
  originImport?: string;
}) {
  const router = useRouter();
  const confirmationButton = useRef<HTMLButtonElement>(null);
  const [targetSelection, setTargetSelection] = useState("");
  const [attachmentChoice, setAttachmentChoice] = useState("");
  const [approver, setApprover] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [note, setNote] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [validation, setValidation] = useState("");
  const guard = useApprovalDraftGuard(
    !!note || !!approver || Object.values(reasons).some((value) => !!value),
  );
  const [confirmed, setConfirmed] = useState<{
    data: FixedApprovalScopeInput;
    preview: FixedApprovalPreview;
    legacyPreview: LegacyApprovalPreview | null;
    requestId: string;
  } | null>(null);
  const metadata = useQuery({
    queryKey: ["approval-release", projectId, releaseId],
    queryFn: () => readRelease(projectId, releaseId),
    retry: false,
  });
  const legacySource = useQuery({
    queryKey: ["legacy-request-source", projectId, legacyId],
    queryFn: () =>
      previewMigration(projectId, {
        legacy_approval_id: legacyId!,
        mode: "archive",
      }),
    enabled: !!legacyId,
    retry: false,
  });
  const archivedOrigin = useQuery({
    queryKey: ["approval-archived-origin", projectId, originImport],
    queryFn: () => readImport(projectId, originImport!),
    enabled: !!originImport,
    retry: false,
  });
  const nodes = useQuery({
    queryKey: ["approval-nodes", projectId, releaseId],
    queryFn: () => allReleaseNodes(projectId, releaseId),
    retry: false,
  });
  const attachments = useQuery({
    queryKey: ["approval-attachments", projectId, releaseId],
    queryFn: async () => {
      const result = await listPreservations(projectId, releaseId, {
        page_size: 100,
      });
      const items = [...result.items];
      for (let p = 2; items.length < result.total; p++) {
        const next = await listPreservations(projectId, releaseId, {
          page: p,
          page_size: 100,
        });
        items.push(...next.items);
        if (!next.items.length) break;
      }
      return items.filter((item) => item.status === "ready");
    },
    retry: false,
  });
  const targets =
    nodes.data?.filter(
      (item) =>
        item.node_kind === "requirement" ||
        item.node_kind === "requirement_document",
    ) ?? [];
  const legacyTarget = legacySource.data?.source ?? archivedOrigin.data?.source;
  const preferredLegacyTarget = legacyTarget
    ? targets.find(
        (item) =>
          item.source_id === legacyTarget.target_id &&
          item.node_kind ===
            (legacyTarget.target_type === "document"
              ? "requirement_document"
              : "requirement"),
      )
    : undefined;
  const targetId =
    targetSelection || preferredLegacyTarget?.id || targets[0]?.id || "";
  const target = targets.find((item) => item.id === targetId);
  const basis = useQuery({
    queryKey: ["approval-basis", projectId, releaseId, targetId],
    queryFn: () =>
      allBasis(projectId, { release_id: releaseId, target_node_id: targetId }),
    enabled: target?.node_kind === "requirement_document",
    retry: false,
  });
  const exceptionRows =
    target?.node_kind === "requirement_document"
      ? (basis.data?.filter((item) => item.state !== "agreed") ?? [])
      : [];
  const candidates = useQuery({
    queryKey: [
      "approval-candidates",
      projectId,
      releaseId,
      attachmentChoice,
      candidateSearch,
      candidatePage,
    ],
    queryFn: () =>
      listCandidates(projectId, {
        release_id: releaseId,
        preservation_id:
          attachmentChoice === "none" ? undefined : attachmentChoice,
        page_size: 100,
        q: candidateSearch || undefined,
        page: candidatePage,
      }),
    enabled: attachmentChoice !== "",
    retry: false,
  });
  const preview = useMutation({
    mutationFn: async (data: FixedApprovalScopeInput) => {
      if (legacyId) {
        const result = await previewMigration(projectId, {
          legacy_approval_id: legacyId,
          mode: "switch",
          new_request: data,
        });
        if (!result.new_request) throw new Error("切替先を確認できません");
        return { preview: result.new_request, legacyPreview: result };
      }
      return {
        preview: await previewApproval(projectId, data),
        legacyPreview: null,
      };
    },
    onSuccess: (result, data) =>
      setConfirmed({ ...result, data, requestId: crypto.randomUUID() }),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!confirmed) throw new Error("先に対象を確認してください");
      if (legacyId && confirmed.legacyPreview) {
        const result = await migrateApproval(projectId, {
          legacy_approval_id: legacyId,
          mode: "switch",
          new_request: confirmed.data,
          request_id: confirmed.requestId,
          expected_preview_digest: confirmed.legacyPreview.preview_digest,
        });
        if (!result.migrated_to)
          throw new Error("切替先の閲覧権限を確認してください");
        return result.migrated_to;
      }
      return (
        await createApproval(projectId, {
          ...confirmed.data,
          request_id: confirmed.requestId,
          expected_preview_digest: confirmed.preview.preview_digest,
        })
      ).id;
    },
    onSuccess: (id) => {
      guard.markSaved();
      router.push(approvalPath(projectId, id));
    },
  });
  const invalidate = () => {
    setConfirmed(null);
    setValidation("");
  };
  const busy = preview.isPending || save.isPending;
  if (
    metadata.error ||
    nodes.error ||
    attachments.error ||
    legacySource.error ||
    archivedOrigin.error
  )
    return (
      <DataLoadError
        resourceName="固定内容と添付"
        onRetry={() => {
          void metadata.refetch();
          void nodes.refetch();
          void attachments.refetch();
          if (legacyId) void legacySource.refetch();
          if (originImport) void archivedOrigin.refetch();
        }}
      />
    );
  if (
    !metadata.data ||
    !nodes.data ||
    !attachments.data ||
    (legacyId && !legacySource.data) ||
    (originImport && !archivedOrigin.data)
  )
    return (
      <p className="text-sm text-muted-foreground">
        保存した内容を読み込んでいます…
      </p>
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {legacyId
            ? `従来申請 #${legacyId} を固定内容へ切り替える`
            : originImport
              ? "従来履歴を引き継いだ内容の再確認"
              : "この内容への合意・正式承認を依頼"}
        </CardTitle>
        <CardDescription>
          対象・添付と指定本人を入力し、申請する範囲を確認します。
        </CardDescription>
        <Button
          type="button"
          variant="outline"
          className="mt-2 self-start"
          onClick={() => {
            confirmationButton.current?.scrollIntoView({ block: "center" });
            confirmationButton.current?.focus({ preventScroll: true });
          }}
        >
          申請前の確認へ移動
        </Button>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            invalidate();
            if (
              !target ||
              !attachmentChoice ||
              !approver ||
              exceptionRows.some((item) => !reasons[item.node_id]?.trim())
            ) {
              setValidation(
                "判断対象・添付の有無・指定先・各例外理由を確認してください",
              );
              return;
            }
            preview.mutate({
              release_id: releaseId,
              target_node_id: targetId,
              preservation_id:
                attachmentChoice === "none" ? null : attachmentChoice,
              attachments_none: attachmentChoice === "none",
              approver_id: Number(approver),
              legacy_import_id: originImport ?? null,
              request_note: note.trim() || null,
              exceptions: exceptionRows.map((item) => ({
                node_id: item.node_id,
                reason: reasons[item.node_id].trim(),
              })),
            });
          }}
        >
          <FieldGroup>
            <Alert>
              <AlertTitle className="min-w-0 break-words">
                {metadata.data.title}・保存時の版 {metadata.data.source_version}
              </AlertTitle>
              <AlertDescription>
                設計・テスト設計は固定版に含めた範囲です。内部用の依頼で、顧客公開は行いません。
              </AlertDescription>
            </Alert>
            <ChoiceField
              label="判断対象"
              value={targetId}
              disabled={busy}
              onChange={(value) => {
                setTargetSelection(value);
                setPage(1);
                invalidate();
              }}
              choices={targets.map((item) => ({
                value: item.id,
                label: `${item.node_kind === "requirement_document" ? "定義書の正式承認" : "個別要件の合意"}：${textValue(item.payload.title)}`,
              }))}
            />
            <ChoiceField
              label="判断に含める添付"
              value={attachmentChoice}
              disabled={busy}
              onChange={(value) => {
                setAttachmentChoice(value);
                setApprover("");
                setCandidatePage(1);
                invalidate();
              }}
              choices={[
                { value: "none", label: "添付なし" },
                ...attachments.data.map((item) => ({
                  value: item.id,
                  label: `保全済み ${item.files.length}件・${new Date(item.completed_at ?? item.created_at).toLocaleString("ja-JP")}`,
                })),
              ]}
            />
            {candidateSearch || (candidates.data?.total ?? 0) > 20 ? (
              <Field>
                <FieldLabel htmlFor="candidate-search">
                  指定先を氏名で絞り込む（任意）
                </FieldLabel>
                <Input
                  id="candidate-search"
                  value={candidateSearch}
                  onChange={(event) => {
                    setCandidateSearch(event.target.value);
                    setCandidatePage(1);
                    setApprover("");
                    invalidate();
                  }}
                  disabled={busy}
                />
              </Field>
            ) : null}
            <ChoiceField
              label="判断を依頼する本人"
              value={approver}
              disabled={busy || !attachmentChoice}
              onChange={(value) => {
                setApprover(value);
                invalidate();
              }}
              choices={
                candidates.data?.items.map((item) => ({
                  value: String(item.id),
                  label: item.name,
                })) ?? []
              }
            />
            {(candidates.data?.total ?? 0) > 100 ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || candidatePage <= 1}
                  onClick={() => {
                    setCandidatePage(candidatePage - 1);
                    setApprover("");
                    invalidate();
                  }}
                >
                  前の候補
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    busy || candidatePage * 100 >= (candidates.data?.total ?? 0)
                  }
                  onClick={() => {
                    setCandidatePage(candidatePage + 1);
                    setApprover("");
                    invalidate();
                  }}
                >
                  次の候補
                </Button>
              </div>
            ) : null}
            {candidates.error ? (
              <DataLoadError
                resourceName="指定可能な本人"
                onRetry={() => void candidates.refetch()}
              />
            ) : null}
            {candidates.data?.total === 0 ? (
              <Alert>
                <AlertTitle>指定できる本人がいません</AlertTitle>
                <AlertDescription>
                  初期の標準権限では、同じプロジェクトの別のプロジェクト管理者が判断します。権限は自動で追加されません。
                </AlertDescription>
              </Alert>
            ) : null}
            {basis.error ? (
              <DataLoadError
                resourceName="要件ごとの合意根拠"
                onRetry={() => void basis.refetch()}
              />
            ) : null}
            {target?.node_kind === "requirement_document" ? (
              <>
                {exceptionRows.length > 1000 ? (
                  <Alert>
                    <AlertTitle>
                      例外理由が必要な要件が1,000件を超えています
                    </AlertTitle>
                    <AlertDescription>
                      一部を省略して申請することはできません。個別要件の合意を先に進めてから再確認してください。
                    </AlertDescription>
                  </Alert>
                ) : null}
                <p className="text-sm">
                  対象要件 {basis.data?.length ?? 0}件 ／ 同じ内容に合意済み{" "}
                  {(basis.data?.length ?? 0) - exceptionRows.length}件 ／
                  例外理由が必要 {exceptionRows.length}件
                </p>
                <p className="text-sm text-muted-foreground">
                  個別要件の合意根拠は本文の一致で確認します。設計・添付は今回の文書承認で確認します。要件0件は「対象要件なし」として扱います。
                </p>
                {exceptionRows.slice((page - 1) * 20, page * 20).map((item) => (
                  <Field
                    key={item.node_id}
                    data-invalid={
                      !!validation && !reasons[item.node_id]?.trim()
                    }
                  >
                    <FieldLabel htmlFor={`reason-${item.node_id}`}>
                      {item.title}
                      <Badge variant="outline">
                        {basisLabels[item.state] ?? item.state}
                      </Badge>
                    </FieldLabel>
                    <Textarea
                      id={`reason-${item.node_id}`}
                      value={reasons[item.node_id] ?? ""}
                      maxLength={2000}
                      disabled={busy}
                      aria-invalid={
                        !!validation && !reasons[item.node_id]?.trim()
                      }
                      placeholder="未合意のまま文書を正式承認する理由"
                      onChange={(event) => {
                        setReasons({
                          ...reasons,
                          [item.node_id]: event.target.value,
                        });
                        invalidate();
                      }}
                    />
                  </Field>
                ))}
                {exceptionRows.length > 20 ? (
                  <DataPagination
                    page={page}
                    pageSize={20}
                    total={exceptionRows.length}
                    currentCount={
                      exceptionRows.slice((page - 1) * 20, page * 20).length
                    }
                    onPageChange={setPage}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                この要件と同梱した設計・添付への合意です。文書内の他の要件は今回の個別合意の対象になりません。
              </p>
            )}
            <Field>
              <FieldLabel htmlFor="approval-note">依頼メモ（任意）</FieldLabel>
              <Textarea
                id="approval-note"
                value={note}
                maxLength={2000}
                disabled={busy}
                onChange={(event) => {
                  setNote(event.target.value);
                  invalidate();
                }}
              />
            </Field>
            {validation ? <FieldError>{validation}</FieldError> : null}
            <FormApiError error={preview.error ?? save.error} />
            {preview.error || save.error ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy || basis.isFetching || candidates.isFetching}
                onClick={() => {
                  invalidate();
                  preview.reset();
                  save.reset();
                  if (target?.node_kind === "requirement_document")
                    void basis.refetch();
                  if (attachmentChoice) void candidates.refetch();
                  void attachments.refetch();
                  if (legacyId) void legacySource.refetch();
                  if (originImport) void archivedOrigin.refetch();
                }}
              >
                入力を残して合意根拠・指定先を再取得
              </Button>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                id="approval-request-confirmation"
                ref={confirmationButton}
                type="submit"
                variant="outline"
                disabled={
                  busy ||
                  !target ||
                  (target.node_kind === "requirement_document" &&
                    !basis.data) ||
                  exceptionRows.length > 1000
                }
              >
                申請する範囲を確認
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={`/projects/joined/${projectId}/artifact-releases?release=${releaseId}`}
                >
                  固定本文・添付を確認
                </Link>
              </Button>
            </div>
            {confirmed ? (
              <Alert>
                <AlertTitle>
                  {confirmed.preview.target_kind === "requirement"
                    ? "個別要件への合意を依頼します"
                    : exceptionRows.length
                      ? `例外${exceptionRows.length}件を含む正式承認を依頼します`
                      : "定義書の正式承認を依頼します"}
                </AlertTitle>
                <AlertDescription>
                  <p>
                    {confirmed.preview.title}
                    。個別要件・タスク・テストの状態は自動変更されません。
                  </p>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => save.mutate()}
                  >
                    {save.isPending
                      ? "保存しています…"
                      : legacyId
                        ? "旧申請から切り替えて依頼"
                        : "この内容で依頼する"}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </form>
        <details className="mt-4 border-t pt-3 text-sm text-muted-foreground">
          <summary className="cursor-pointer rounded-sm focus-visible:outline-2">
            固定内容と依頼の補足
          </summary>
          <p className="mt-2">
            設計や元の要件が後から変わっても、この依頼の対象は変わりません。対象の本文・添付と指定本人を確認してから、依頼前の確認へ進みます。
          </p>
        </details>
        <ConfirmDialog {...guard.dialogProps} />
      </CardContent>
    </Card>
  );
}
