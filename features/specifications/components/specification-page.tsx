"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/layout/page-header";
import { ArtifactReleaseLink } from "@/features/artifact-releases/components/artifact-release-link";
import { ArtifactPublicationLink } from "@/features/artifact-publications/components/artifact-publication-link";
import { SourceCommentTabs } from "@/features/artifact-publications/components/source-comment-tabs";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { ConflictResolutionDialog } from "@/components/shared/dialogs/conflict-resolution-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canCreateDocument,
  canUpdateDocument,
  canDeleteDocument,
  canReviewRequirement,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFormDraft } from "@/hooks/use-form-draft";
import { createDraftScope } from "@/lib/draft/draft-key";
import { getConflictCurrent, getConflictFields } from "@/lib/api/conflict";
import { formatDateTime } from "@/lib/format/date";
import type {
  SpecificationRead,
  SpecificationReadStatus,
} from "@/lib/api/generated/model";
import {
  readSpecification,
  updateSpecification,
  updateStatus,
  deleteSpecification,
  listRevisions,
  readRevision,
  listLinks,
} from "../lib/api";
import {
  initialValues,
  kindLabels,
  relatedHref,
  reviewElementId,
  reviewPathLabel,
  specificationCode,
  specificationHref,
  specificationKeys,
  statusLabels,
  type Kind,
  type Values,
  type DesignReviewQuote,
  type DesignReviewTarget,
} from "../lib/specification";
import {
  designKey,
  readDesignCollections,
  readMemberships,
  screenKinds,
  updateMemberships,
} from "../lib/workspace";
import { mergeSpecifications } from "../lib/merge";
import { SpecificationForm } from "./specification-form";
import { SpecificationReview } from "./specification-review";
import { SpecificationLinks } from "./specification-links";
import { RelatedSpecifications } from "./related-specifications";
import {
  DesignDetails,
  designTabs,
  detailsTab,
} from "./workspace/design-details";
import { DesignImpactPanel, DesignMappings } from "./workspace/design-impact";
import { DesignFormats } from "./workspace/design-formats";
import {
  FixedDesignDependencies,
  type DesignSnapshot,
} from "./workspace/fixed-design-dependencies";

export function SpecificationPage({
  projectId,
  id,
  kind = "api",
  inline = false,
}: {
  projectId: number;
  id?: number;
  mode?: "create" | "view" | "edit";
  kind?: Kind;
  inline?: boolean;
}) {
  const { currentProjectRole, isLoading } = useCurrentProjectRole(projectId);
  const query = useQuery({
    queryKey: specificationKeys.detail(projectId, id ?? 0),
    queryFn: () => readSpecification(projectId, id!),
    enabled: Boolean(id),
    retry: false,
  });
  if (isLoading || (id && query.isPending))
    return <p role="status">設計書を読み込み中…</p>;
  if (query.error)
    return (
      <DataLoadError
        resourceName="設計書"
        isRetrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  if (!id)
    return canCreateDocument(currentProjectRole) ? (
      <div className="space-y-4">
        <PageHeader title={`${kindLabels[kind]}を作成`} />
        <SpecificationForm projectId={projectId} kind={kind} />
      </div>
    ) : (
      <p role="alert">設計書を作成する権限がありません。</p>
    );
  if (!query.data) return null;
  return (
    <DesignEditor
      key={id}
      projectId={projectId}
      row={query.data}
      inline={inline}
      canEdit={canUpdateDocument(currentProjectRole)}
      canRegisterParts={canCreateDocument(currentProjectRole)}
      canDelete={canDeleteDocument(currentProjectRole)}
      canApprove={canReviewRequirement(currentProjectRole)}
    />
  );
}

type Draft = { values: Values; original: Values; version: number };

function DesignEditor({
  projectId,
  row,
  canEdit,
  canRegisterParts,
  canDelete,
  canApprove,
  inline,
}: {
  projectId: number;
  row: SpecificationRead;
  canEdit: boolean;
  canRegisterParts: boolean;
  canDelete: boolean;
  canApprove: boolean;
  inline: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const cache = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [conflict, setConflict] = useState<SpecificationRead | null>(null);
  const initial = initialValues(row.kind, row);
  const current = draft?.values ?? initial;
  const original = draft?.original ?? initial;
  const dirty = JSON.stringify(current) !== JSON.stringify(original);
  const [localTab, setLocalTab] = useState(
    params.get("tab") ??
      (params.get("focus")
        ? detailsTab(row.kind, params.get("focus")!)
        : "content"),
  );
  const tabs = designTabs[row.kind];
  const tab =
    tabs.some(([key]) => key === localTab) ||
    ["links", "impact", "review", "history"].includes(localTab)
      ? localTab
      : "content";
  const [target, setTarget] = useState<DesignReviewTarget | null>(() => {
    const path = params.get("review");
    return !inline && canEdit && path && path.length <= 300 ? { path } : null;
  });
  const [internalRequest, setInternalRequest] = useState(0);
  const [focused, setFocused] = useState<string | null>(params.get("focus"));
  const [focusedQuote, setFocusedQuote] = useState<DesignReviewQuote>();
  const [historyVersion, setHistoryVersion] = useState<number>();
  const requestedVersion = Number(params.get("version"));
  const initialHistoryVersion =
    Number.isSafeInteger(requestedVersion) &&
    requestedVersion >= 1 &&
    requestedVersion <= row.version
      ? requestedVersion
      : undefined;
  const [deleting, setDeleting] = useState(false);
  const [groupDraft, setGroupDraft] = useState<{
    ids: string[];
    version: number;
  }>();
  const memberships = useQuery({
    queryKey: [...designKey(projectId), "memberships", row.id],
    queryFn: () => readMemberships(projectId, row.id),
    enabled: row.kind === "screen",
  });
  const collections = useQuery({
    queryKey: [...designKey(projectId), "collections"],
    queryFn: () => readDesignCollections(projectId),
    enabled: row.kind === "screen",
  });
  const groups =
    collections.data?.filter((item) => item.kind === "group") ?? [];
  const selectedGroups = groupDraft?.ids ?? memberships.data?.group_ids ?? [];
  const drafts = useFormDraft<Draft>({
    userId: canEdit ? user?.id : undefined,
    scope: createDraftScope(
      "design-workspace",
      row.kind,
      "update",
      projectId,
      row.id,
    ),
    values: draft ?? {
      values: initial,
      original: initial,
      version: row.version,
    },
    initialValues: {
      values: original,
      original,
      version: draft?.version ?? row.version,
    },
    onRestore: setDraft,
  });
  const refresh = async (saved?: SpecificationRead) => {
    if (saved)
      cache.setQueryData(specificationKeys.detail(projectId, row.id), saved);
    await Promise.all([
      cache.invalidateQueries({ queryKey: specificationKeys.all(projectId) }),
      cache.invalidateQueries({ queryKey: designKey(projectId) }),
    ]);
  };
  const groupSave = useMutation({
    mutationFn: (value: { ids: string[]; version: number }) =>
      updateMemberships(projectId, row.id, {
        group_ids: value.ids,
        version: value.version,
      }),
    onSuccess: async (saved) => {
      setGroupDraft(undefined);
      await refresh(saved);
    },
  });
  const saved = useMutation({
    mutationFn: ({ values, version }: { values: Values; version: number }) =>
      updateSpecification(projectId, row.id, {
        ...values,
        title: values.title.trim(),
        version,
      }),
    onSuccess: async (result) => {
      drafts.clearDraft();
      setDraft(null);
      setConflict(null);
      await refresh(result);
    },
    onError: (error) =>
      setConflict(getConflictCurrent<SpecificationRead>(error)),
  });
  const status = useMutation({
    mutationFn: (status: SpecificationReadStatus) =>
      updateStatus(projectId, row.id, { version: row.version, status }),
    onSuccess: (result) => refresh(result),
  });
  const deleted = useMutation({
    mutationFn: () =>
      deleteSpecification(projectId, row.id, { version: row.version }),
    onSuccess: async () => {
      await refresh();
      router.push(`${specificationHref(projectId)}?kind=${row.kind}`);
    },
  });
  const links = useQuery({
    queryKey: [...specificationKeys.detail(projectId, row.id), "links"],
    queryFn: () => listLinks(projectId, row.id),
    enabled: deleting || (row.kind === "screen" && tab === "basic"),
  });
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    if (!focused || tab !== detailsTab(row.kind, focused)) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(reviewElementId(focused));
      element?.scrollIntoView({ block: "center" });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focused, row.kind, tab]);
  const chooseTab = (value: string) => {
    setLocalTab(value);
    if (inline) return;
    const next = new URLSearchParams(window.location.search);
    if (value === "content") next.delete("tab");
    else next.set("tab", value);
    const base = specificationHref(projectId, row.id);
    window.history.replaceState(null, "", next.size ? `${base}?${next}` : base);
  };
  const review = (path: string, context?: string | DesignReviewQuote) => {
    if (dirty) {
      toast.info("指摘を登録する前に設計を保存してください。");
      return;
    }
    setTarget({
      path,
      quote: typeof context === "object" ? context : undefined,
    });
    setInternalRequest((value) => value + 1);
    chooseTab("review");
  };
  const comparison = conflict
    ? mergeSpecifications(original, current, initialValues(row.kind, conflict))
    : null;
  const comparisonEntries = Object.entries(comparison?.conflicts ?? {});
  const canRequest =
    row.status === "draft" || row.status === "changes_requested";
  const identifier =
    current.content.type === "screen"
      ? current.content.route
      : current.content.type === "api"
        ? `${current.content.method ?? ""} ${current.content.path ?? ""}`.trim()
        : current.content.physical_name;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`${specificationHref(projectId)}?kind=${row.kind}`}
          className="hover:text-foreground hover:underline"
        >
          {kindLabels[row.kind]}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-mono">{specificationCode(row)}</span>
        {identifier && <span className="font-mono">{identifier}</span>}
        {current.content.type === "screen" && (
          <>
            <Badge variant="outline">
              {screenKinds[current.content.screen_kind ?? "other"]}
            </Badge>
            {groups
              .filter((group) => memberships.data?.group_ids.includes(group.id))
              .map((group) => (
                <Link
                  className="hover:underline"
                  key={group.id}
                  href={`${specificationHref(projectId)}?kind=screen&group=${group.id}`}
                >
                  {group.name}
                </Link>
              ))}
          </>
        )}
      </div>
      <PageHeader
        title={row.title}
        description={`版 ${row.version} · ${formatDateTime(row.updated_at)}`}
        actions={
          <>
            {canEdit && (
              <Button
                disabled={
                  !dirty ||
                  !current.title.trim() ||
                  saved.isPending ||
                  Boolean(conflict)
                }
                onClick={() =>
                  saved.mutate({
                    values: current,
                    version: draft?.version ?? row.version,
                  })
                }
              >
                {saved.isPending ? "保存中…" : "保存"}
              </Button>
            )}
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  drafts.clearDraft();
                  setDraft(null);
                  setConflict(null);
                  saved.reset();
                }}
              >
                変更を取り消す
              </Button>
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{statusLabels[row.status]}</Badge>
        <span className="text-xs text-muted-foreground" role="status">
          {saved.isPending
            ? "保存中"
            : saved.error
              ? "保存失敗"
              : dirty
                ? "未保存の変更"
                : "保存済み"}
        </span>
        {canEdit && canRequest && (
          <Button
            size="sm"
            variant="outline"
            disabled={dirty || status.isPending}
            onClick={() => status.mutate("in_review")}
          >
            レビューを依頼
          </Button>
        )}
        {canEdit && canApprove && row.status === "in_review" && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={dirty || status.isPending}
              onClick={() => status.mutate("changes_requested")}
            >
              修正を依頼
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={dirty || status.isPending}
              onClick={() => status.mutate("approved")}
            >
              この版を承認
            </Button>
          </>
        )}
        {canEdit && row.status === "approved" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={dirty || status.isPending}
            onClick={() => status.mutate("draft")}
          >
            次版の下書き
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ArtifactReleaseLink
            projectId={projectId}
            kind="specification"
            sourceId={row.id}
            version={row.version}
          />
          <ArtifactPublicationLink
            projectId={projectId}
            kind="specification"
            id={row.id}
            version={row.version}
          />
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              disabled={dirty}
              onClick={() => setDeleting(true)}
            >
              削除
            </Button>
          )}
        </div>
      </div>
      <FormApiError error={saved.error ?? status.error ?? deleted.error} />
      <Tabs value={tab} onValueChange={chooseTab}>
        <TabsList variant="line" className="max-w-full flex-wrap justify-start">
          {tabs.map(([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="links">関連</TabsTrigger>
          <TabsTrigger value="impact">変更影響</TabsTrigger>
          <TabsTrigger value="review">レビュー指摘</TabsTrigger>
          <TabsTrigger value="history">版履歴</TabsTrigger>
        </TabsList>
      </Tabs>
      {row.kind === "screen" && tab === "basic" && (
        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
          <fieldset className="space-y-1 text-sm">
            <legend className="font-medium">機能グループ</legend>
            {groups.map((group) => (
              <label key={group.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(group.id)}
                  disabled={
                    !canEdit || !memberships.data || groupSave.isPending
                  }
                  onChange={(event) => {
                    if (!memberships.data) return;
                    setGroupDraft({
                      version: groupDraft?.version ?? memberships.data.version,
                      ids: event.target.checked
                        ? [...selectedGroups, group.id]
                        : selectedGroups.filter((id) => id !== group.id),
                    });
                  }}
                />
                {group.name}
              </label>
            ))}
            {groupDraft && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={dirty || groupSave.isPending}
                  onClick={() => groupSave.mutate(groupDraft)}
                >
                  所属を保存
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={groupSave.isPending}
                  onClick={() => {
                    setGroupDraft(undefined);
                    groupSave.reset();
                    void memberships.refetch();
                  }}
                >
                  選択を戻す
                </Button>
              </div>
            )}
            <FormApiError
              error={groupSave.error ?? memberships.error ?? collections.error}
            />
          </fieldset>
          <section className="space-y-1 text-sm">
            <h2 className="font-medium">関連要件</h2>
            <ul>
              {links.data
                ?.filter((link) => link.target_type === "requirement")
                .map((link) => (
                  <li key={link.id}>
                    <Link
                      className="text-primary hover:underline"
                      href={relatedHref(projectId, link)}
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
            </ul>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => chooseTab("links")}
            >
              関連を開く
            </Button>
          </section>
        </div>
      )}
      {tab === "links" ? (
        <div className="space-y-5">
          <DesignMappings
            projectId={projectId}
            id={row.id}
            content={current.content}
            readOnly={!canEdit}
            onChange={(content) =>
              setDraft({
                values: { ...current, content },
                original,
                version: draft?.version ?? row.version,
              })
            }
          />
          <SpecificationLinks
            projectId={projectId}
            id={row.id}
            canEdit={canEdit}
          />
          <RelatedSpecifications
            projectId={projectId}
            targetType="specification"
            targetId={String(row.id)}
          />
        </div>
      ) : tab === "impact" ? (
        <DesignImpactPanel
          projectId={projectId}
          id={row.id}
          canEdit={canEdit}
        />
      ) : tab === "review" ? (
        <div className="max-w-3xl">
          <SourceCommentTabs
            projectId={projectId}
            sourceKind="specification"
            sourceId={row.id}
            internalRequest={internalRequest}
          >
            <SpecificationReview
              projectId={projectId}
              row={row}
              canEdit={canEdit}
              target={target}
              onTarget={setTarget}
              onNavigate={(path, quote) => {
                setFocused(path);
                setFocusedQuote(quote);
                chooseTab(detailsTab(row.kind, path));
              }}
              onHistory={(version, path, quote) => {
                setHistoryVersion(version);
                setFocused(path);
                setFocusedQuote(quote);
                chooseTab("history");
              }}
            />
          </SourceCommentTabs>
        </div>
      ) : tab === "history" ? (
        <DesignHistory
          projectId={projectId}
          row={row}
          initialVersion={historyVersion ?? initialHistoryVersion}
          focusPath={focused}
          focusQuote={focusedQuote}
        />
      ) : (
        <DesignDetails
          projectId={projectId}
          id={row.id}
          values={current}
          tab={tab}
          readOnly={!canEdit}
          canRegisterParts={canRegisterParts}
          focusPath={focused}
          focusQuote={focusedQuote}
          onChange={(values) =>
            setDraft({
              values,
              original,
              version: draft?.version ?? row.version,
            })
          }
          dirty={dirty}
          onReview={canEdit ? review : undefined}
        />
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="設計書をごみ箱に移動しますか？"
        description={
          links.isPending
            ? "関連する要件・API・タスク・テストを確認中です。"
            : `直接関連する成果物は${links.data?.length ?? 0}件です。設計が削除されると図の表示対象から外れます。`
        }
        confirmLabel="ごみ箱へ移動"
        destructive
        isPending={deleted.isPending || links.isPending}
        onConfirm={() => deleted.mutateAsync()}
      />
      <DraftRestoreDialog
        open={Boolean(drafts.pendingDraft)}
        onRestore={drafts.restoreDraft}
        onDiscard={drafts.discardDraft}
      />
      {conflict && comparison && (
        <ConflictResolutionDialog
          open={Boolean(conflict)}
          onOpenChange={(open) => {
            if (!open) setConflict(null);
          }}
          fields={getConflictFields({
            original: Object.fromEntries(
              comparisonEntries.map(([key, value]) => [key, value.original]),
            ),
            local: Object.fromEntries(
              comparisonEntries.map(([key, value]) => [key, value.local]),
            ),
            current: Object.fromEntries(
              comparisonEntries.map(([key, value]) => [key, value.current]),
            ),
          })}
          localValues={Object.fromEntries(
            comparisonEntries.map(([key, value]) => [key, value.local]),
          )}
          currentValues={Object.fromEntries(
            comparisonEntries.map(([key, value]) => [key, value.current]),
          )}
          fieldLabels={Object.fromEntries(
            comparisonEntries.map(([key]) => [
              key,
              reviewPathLabel(current, key),
            ]),
          )}
          onResolve={(choices) => {
            const next = initialValues(row.kind, conflict);
            const merged = mergeSpecifications(
              original,
              current,
              next,
              Object.fromEntries(
                comparisonEntries.map(([key, entry]) => [
                  key,
                  JSON.stringify(choices[key]) === JSON.stringify(entry.current)
                    ? "current"
                    : "local",
                ]),
              ),
            );
            setDraft({
              values: merged.values,
              original: next,
              version: conflict.version,
            });
            setConflict(null);
            saved.reset();
          }}
        />
      )}
    </div>
  );
}

function DesignHistory({
  projectId,
  row,
  initialVersion,
  focusPath,
  focusQuote,
}: {
  projectId: number;
  row: SpecificationRead;
  initialVersion?: number;
  focusPath?: string | null;
  focusQuote?: DesignReviewQuote;
}) {
  const [version, setVersion] = useState(initialVersion);
  const [tab, setTab] = useState(
    focusPath ? detailsTab(row.kind, focusPath) : "content",
  );
  const revisions = useQuery({
    queryKey: [...specificationKeys.detail(projectId, row.id), "history"],
    queryFn: () => listRevisions(projectId, row.id),
    retry: false,
  });
  const fixed = useQuery({
    queryKey: [
      ...specificationKeys.detail(projectId, row.id),
      "revision",
      version,
    ],
    queryFn: () => readRevision(projectId, row.id, version!),
    enabled: Boolean(version),
    retry: false,
  });
  const past = fixed.data?.snapshot as unknown as DesignSnapshot | undefined;
  return (
    <section className="space-y-3">
      {revisions.isPending && <p role="status">版履歴を読み込み中…</p>}
      <FormApiError error={revisions.error ?? fixed.error} />
      <div className="flex flex-wrap gap-2">
        {revisions.data?.map((entry) => (
          <Button
            key={entry.number}
            variant={entry.number === version ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setVersion(entry.number);
              setTab("content");
            }}
          >
            版 {entry.number} · {formatDateTime(entry.created_at)}
          </Button>
        ))}
      </div>
      {past && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              版 {past.version} · {statusLabels[past.status]}
            </h2>
            {past.status === "approved" && (
              <ArtifactPublicationLink
                projectId={projectId}
                kind="specification"
                id={past.id}
                version={past.version}
                label="この承認版を共有"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {designTabs[past.kind].map(([key, label]) => (
              <Button
                size="sm"
                key={key}
                variant={tab === key ? "secondary" : "ghost"}
                onClick={() => setTab(key)}
              >
                {label}
              </Button>
            ))}
            {past.dependencies && (
              <Button
                size="sm"
                variant={tab === "fixed-dependencies" ? "secondary" : "ghost"}
                onClick={() => setTab("fixed-dependencies")}
              >
                固定版の関連・配置
              </Button>
            )}
          </div>
          {tab === "fixed-dependencies" ? (
            <FixedDesignDependencies
              key={past.version}
              projectId={projectId}
              snapshot={past}
            />
          ) : tab === "output" && past.kind !== "screen" ? (
            <DesignFormats
              key={past.version}
              projectId={projectId}
              kind={past.kind}
              designId={past.id}
              revision={past.version}
            />
          ) : (
            <DesignDetails
              key={past.version}
              projectId={projectId}
              id={past.id}
              values={initialValues(past.kind, past)}
              onChange={() => undefined}
              readOnly
              tab={tab}
              revision={past.version}
              focusPath={focusPath}
              focusQuote={focusQuote}
            />
          )}
        </div>
      )}
    </section>
  );
}
