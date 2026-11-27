"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  PanelRightCloseIcon,
} from "lucide-react";
import { DocumentObjectives } from "./document-objectives";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { listRequirementsProjectsProjectIdRequirementsGet } from "@/lib/api/generated/requirements/requirements";

import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { MarkdownBodyText } from "@/components/shared/forms/markdown-body-text";
import { Input } from "@/components/ui/input";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  RequirementDocumentRead,
  RequirementTargetCommentRead,
} from "@/lib/api/generated/model";
import { scrollToRequirementContent } from "@/features/requirements/lib/scroll-to-requirement-content";
import { cn } from "@/lib/utils";
import {
  quoteRenderedRange,
  renderedQuoteRange,
  renderedText,
  resolveRenderedQuote,
  showQuoteRange,
  type RenderedQuote,
} from "@/lib/comments/rendered-range";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateRequirementChangeLogs,
  invalidateRequirementTargetComments,
} from "../../../lib/requirement-cache";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { SourceCommentTabs } from "@/features/artifact-publications/components/source-comment-tabs";
import { CommentIconButton } from "@/components/shared/comments/comment-thread-actions";
import {
  CommentPaneResizeHandle,
  useCommentPaneWidth,
} from "@/components/shared/comments/comment-pane-resize";

import { useRequirementSections } from "../../../hooks/use-requirement-sections";
import { useCreateRequirementSection } from "../../../hooks/use-create-requirement-section";
import { useUpdateRequirementSectionSortOrder } from "../../../hooks/use-update-requirement-section-sort-order";
import { useSectionEdits } from "../../../hooks/use-section-edits";
import { useTargetComments } from "../../../hooks/use-target-comments";
import { sectionEditBuffer } from "../../../lib/section-edit-buffer";
import {
  getRequirementReviewAnchorKey,
  isRequirementReviewTargetAnchor,
  normalizeReviewText,
  type RequirementReviewTargetAnchor,
} from "../../../lib/requirement-review-anchor";
import { RequirementTargetCommentsSection } from "../../sections/requirement-target-comments-section";
import { SectionBodyEditor } from "../../sections/section-detail/section-body-editor";

type RequirementDocumentOverviewProps = {
  projectId: number;
  documentId: number;
  document: RequirementDocumentRead;
  canComment: boolean;
  canCreate: boolean;
  canUpdate: boolean;
};

type PreviewQuote = RequirementReviewTargetAnchor &
  RenderedQuote & {
    document_version: number;
  };

export function RequirementDocumentOverview({
  projectId,
  documentId,
  document,
  canComment: canCommentRequested,
  canCreate,
  canUpdate,
}: RequirementDocumentOverviewProps) {
  const commentsId = useId();
  const commentToggleRef = useRef<HTMLButtonElement>(null);
  const commentPanelRef = useRef<HTMLElement>(null);
  const chapterTitleRef = useRef<HTMLInputElement>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { user } = useAuth();
  const paneWidth = useCommentPaneWidth(user?.id);
  const isMobile = useIsMobile();
  const [outlinePreference, setOutlinePreference] = useState<boolean | null>(
    null,
  );
  const outlineOpen = outlinePreference ?? !isMobile;
  const [addingChapter, setAddingChapter] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const { scope, edits } = useSectionEdits(projectId, documentId);
  const { moveRequirementSection, isPending: reordering } =
    useUpdateRequirementSectionSortOrder(projectId, documentId);
  const reorderDisabled =
    reordering || addingChapter || Object.keys(edits).length > 0;
  const {
    createRequirementSection,
    isPending: creatingChapter,
    error: createError,
  } = useCreateRequirementSection(projectId, documentId);
  const [selectedTargetAnchor, setSelectedTargetAnchor] =
    useState<PreviewQuote | null>(null);
  const [previewTexts, setPreviewTexts] = useState<Record<string, string>>({});
  const [reanchor, setReanchor] = useState<{
    comment: RequirementTargetCommentRead;
    selection?: PreviewQuote;
  } | null>(null);
  const [reanchorError, setReanchorError] = useState<Error>();
  const [savingAnchor, setSavingAnchor] = useState(false);
  const queryClient = useQueryClient();
  const articleRef = useRef<HTMLElement>(null);
  const updatePreviewText = useCallback((key: string, value: string) => {
    setPreviewTexts((current) =>
      current[key] === value ? current : { ...current, [key]: value },
    );
  }, []);
  const [internalCommentRequest, setInternalCommentRequest] = useState(0);
  const {
    sections,
    isLoading: isSectionsLoading,
    error: sectionsError,
    refetch: refetchSections,
  } = useRequirementSections(projectId, documentId);
  const requirementsQuery = useInfiniteQuery({
    queryKey: ["requirement-document-preview", projectId, documentId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listRequirementsProjectsProjectIdRequirementsGet(projectId, {
        page: pageParam,
        page_size: 100,
        document_id: documentId,
        sort: "code_asc",
      }),
    getNextPageParam: (last) =>
      last.page * last.page_size < last.total ? last.page + 1 : undefined,
    retry: false,
  });
  const requirements =
    requirementsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const isRequirementsLoading = requirementsQuery.isPending;
  const total = requirementsQuery.data?.pages[0]?.total ?? 0;
  const canComment =
    canCommentRequested &&
    !isRequirementsLoading &&
    !isSectionsLoading &&
    !sectionsError &&
    !requirementsQuery.hasNextPage &&
    !requirementsQuery.error;
  const { comments: targetComments } = useTargetComments(
    projectId,
    "document",
    documentId,
  );
  const sortedSections = sections
    .slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  const unassignedRequirements = requirements.filter(
    (requirement) => !requirement.section_id,
  );
  const documentPath = `/projects/joined/${projectId}/requirements/${documentId}`;
  const openComments = () => {
    setCommentsOpen(true);
    requestAnimationFrame(() => {
      const panel = commentPanelRef.current;
      if (
        panel &&
        panel.getBoundingClientRect().left <=
          (panel.parentElement?.getBoundingClientRect().left ?? 0) + 1
      ) {
        scrollToRequirementContent(panel);
        panel.focus({ preventScroll: true });
      }
    });
  };
  const selectCommentAnchor = (anchor: PreviewQuote) => {
    if (!canComment) return;
    setInternalCommentRequest((request) => request + 1);
    if (reanchor) {
      setReanchor({ comment: reanchor.comment, selection: anchor });
      setReanchorError(undefined);
      openComments();
      return;
    }
    setSelectedTargetAnchor(anchor);
    openComments();
  };

  const handleTargetAnchorClick = (targetAnchor: Record<string, unknown>) => {
    if (!isRequirementReviewTargetAnchor(targetAnchor)) return;
    const anchorKey = getRequirementReviewAnchorKey(targetAnchor);
    const element = articleRef.current?.querySelector<HTMLElement>(
      `[data-document-preview-anchor-key="${CSS.escape(anchorKey)}"]`,
    );
    if (!element || !targetAnchor.quote) return;
    const anchor = compatiblePreviewQuote(targetAnchor, renderedText(element));
    const range = anchor && renderedQuoteRange(element, anchor);
    if (range) showQuoteRange(range);
  };

  const getTargetAnchorStatus = (targetAnchor: Record<string, unknown>) => {
    if (
      isRequirementsLoading ||
      isSectionsLoading ||
      sectionsError ||
      requirementsQuery.hasNextPage ||
      requirementsQuery.error
    )
      return null;
    if (
      !isRequirementReviewTargetAnchor(targetAnchor) ||
      targetAnchor.scope !== "document_preview"
    )
      return null;
    if (
      targetAnchor.document_id != null &&
      targetAnchor.document_id !== documentId
    )
      return "missing";
    if (targetAnchor.preview_target_type === "section") {
      const id = targetAnchor.preview_target_id;
      if (!sections.some((section) => section.id === id)) return "missing";
      if (id != null && edits[id]) return null;
    }
    const current = previewTexts[getRequirementReviewAnchorKey(targetAnchor)];
    if (current === undefined) return "missing";
    const anchor = compatiblePreviewQuote(targetAnchor, current);
    const result = anchor && resolveRenderedQuote(anchor, current);
    return result ? (result.moved ? "moved" : "current") : "missing";
  };

  const confirmReanchor = async () => {
    if (!reanchor?.selection || savingAnchor) return;
    setSavingAnchor(true);
    setReanchorError(undefined);
    try {
      await apiClient(
        `/projects/${projectId}/comments/${reanchor.comment.id}/anchor`,
        {
          method: "PATCH",
          body: JSON.stringify({
            version: reanchor.comment.version,
            anchor: reanchor.selection,
          }),
        },
      );
      setReanchor(null);
      await Promise.all([
        invalidateRequirementTargetComments(
          queryClient,
          projectId,
          "document",
          documentId,
        ),
        invalidateRequirementChangeLogs(queryClient, projectId),
      ]);
    } catch (error) {
      setReanchorError(
        error instanceof Error
          ? error
          : new Error("引用箇所を更新できませんでした。"),
      );
    } finally {
      setSavingAnchor(false);
    }
  };

  return (
    <div className="@container/document-overview flex min-w-0 flex-col gap-4">
      {requirementsQuery.error && (
        <DataLoadError
          resourceName="本文の関連要件"
          isRetrying={requirementsQuery.isFetching}
          onRetry={() => void requirementsQuery.refetch()}
        />
      )}
      {requirementsQuery.hasNextPage && (
        <div
          className="flex flex-wrap items-center gap-3 border-b pb-3"
          role="status"
        >
          <p className="text-sm">
            全{total}件中{requirements.length}
            件を表示しています。全文への箇所指定レビューは全件の読込後にできます。
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={requirementsQuery.isFetchingNextPage}
            onClick={() => void requirementsQuery.fetchNextPage()}
          >
            {requirementsQuery.isFetchingNextPage
              ? "読込中…"
              : "次の要件を読み込む"}
          </Button>
        </div>
      )}
      {sectionsError ? (
        <DataLoadError
          resourceName="章"
          onRetry={() => void refetchSections()}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={outlineOpen}
          aria-controls={`${commentsId}-outline`}
          onClick={() => setOutlinePreference(!outlineOpen)}
        >
          <ChevronDownIcon
            data-icon="inline-start"
            className={outlineOpen ? undefined : "-rotate-90"}
          />
          目次
        </Button>
        <Button
          ref={commentToggleRef}
          type="button"
          size="sm"
          variant="outline"
          aria-expanded={commentsOpen}
          aria-controls={commentsId}
          onClick={() => {
            if (commentsOpen) setCommentsOpen(false);
            else openComments();
          }}
        >
          <MessageSquareIcon data-icon="inline-start" />
          コメント{targetComments.length ? ` (${targetComments.length})` : ""}
        </Button>
      </div>

      <div
        style={
          { "--comment-pane-width": `${paneWidth.width}px` } as CSSProperties
        }
        className={cn(
          "grid min-w-0 gap-5 @min-[48rem]/document-overview:items-start",
          outlineOpen &&
            "@min-[48rem]/document-overview:grid-cols-[13rem_minmax(0,1fr)]",
          commentsOpen &&
            !outlineOpen &&
            "@min-[61rem]/document-overview:grid-cols-[minmax(0,1fr)_var(--comment-pane-width)]",
          commentsOpen &&
            outlineOpen &&
            "@min-[76rem]/document-overview:grid-cols-[13rem_minmax(0,1fr)_var(--comment-pane-width)]",
        )}
      >
        <nav
          aria-label="本文の目次"
          id={`${commentsId}-outline`}
          hidden={!outlineOpen}
          className="min-w-0 @min-[48rem]/document-overview:sticky @min-[48rem]/document-overview:top-20 @min-[48rem]/document-overview:max-h-[calc(100dvh-6rem)] @min-[48rem]/document-overview:overflow-y-auto @min-[48rem]/document-overview:border-e @min-[48rem]/document-overview:pe-3"
        >
          <ol className="flex max-h-40 flex-col gap-1 overflow-y-auto @min-[48rem]/document-overview:max-h-none">
            <li>
              <OutlineLink href="#document-purpose">目的</OutlineLink>
            </li>
            {sortedSections.map((section, index) => (
              <li key={section.id} className="flex min-w-0 items-center gap-1">
                <OutlineLink href={`#chapter-${section.id}`}>
                  {section.title}
                </OutlineLink>
                {canUpdate && reorderOpen ? (
                  <div className="ms-auto flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${section.title}を上へ移動`}
                      disabled={reorderDisabled || index === 0}
                      onClick={() =>
                        moveRequirementSection(sortedSections, section.id, "up")
                      }
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${section.title}を下へ移動`}
                      disabled={
                        reorderDisabled || index === sortedSections.length - 1
                      }
                      onClick={() =>
                        moveRequirementSection(
                          sortedSections,
                          section.id,
                          "down",
                        )
                      }
                    >
                      <ChevronDownIcon />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
            {unassignedRequirements.length ? (
              <li>
                <OutlineLink href="#unassigned-requirements">
                  セクション未設定
                </OutlineLink>
              </li>
            ) : null}
          </ol>
          {canUpdate && sortedSections.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={reorderOpen}
              onClick={() => setReorderOpen((open) => !open)}
              className="mt-2"
            >
              {reorderOpen ? "章の並び替えを閉じる" : "章を並び替える"}
            </Button>
          ) : null}
          {reorderOpen && Object.keys(edits).length > 0 ? (
            <p className="text-xs text-muted-foreground" role="status">
              本文の編集を終了すると章を移動できます。
            </p>
          ) : null}
          {canCreate && scope && !isSectionsLoading && !sectionsError ? (
            addingChapter ? (
              <form
                className="mt-3 flex flex-col gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const title = chapterTitle.trim();
                  if (!title || creatingChapter) return;
                  try {
                    const chapter = await createRequirementSection({
                      title,
                      sectionType: "overview",
                      content: "",
                      sortOrder: String(
                        Math.max(
                          0,
                          ...sections.map((item) => item.sort_order ?? 0),
                        ) + 10,
                      ),
                      status: "draft",
                    });
                    if (canUpdate) sectionEditBuffer.begin(scope, chapter);
                    setAddingChapter(false);
                    setChapterTitle("");
                    requestAnimationFrame(() => {
                      const input = window.document.getElementById(
                        `section-body-${chapter.id}`,
                      );
                      scrollToRequirementContent(
                        input ??
                          window.document.getElementById(
                            `chapter-${chapter.id}`,
                          ),
                      );
                      input?.focus({ preventScroll: true });
                    });
                  } catch {
                    // フォーム上にエラーを表示し、章名を保持する。
                  }
                }}
              >
                <label
                  htmlFor={`${commentsId}-chapter-title`}
                  className="text-sm font-medium"
                >
                  章名
                </label>
                <Input
                  ref={chapterTitleRef}
                  id={`${commentsId}-chapter-title`}
                  value={chapterTitle}
                  onChange={(event) => setChapterTitle(event.target.value)}
                  required
                  disabled={creatingChapter}
                />
                {createError ? <FormApiError error={createError} /> : null}
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!chapterTitle.trim() || creatingChapter}
                  >
                    {creatingChapter ? "追加中…" : "追加"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={creatingChapter}
                    onClick={() => setAddingChapter(false)}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2"
                disabled={reordering}
                onClick={() => {
                  setAddingChapter(true);
                  requestAnimationFrame(() => chapterTitleRef.current?.focus());
                }}
              >
                <PlusIcon data-icon="inline-start" />
                章を追加
              </Button>
            )
          ) : null}
        </nav>
        <div className="min-w-0">
          {isSectionsLoading || isRequirementsLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : (
            <article
              ref={articleRef}
              className="mx-auto flex max-w-4xl min-w-0 flex-col gap-8"
            >
              <details className="rounded-md border px-4 py-3">
                <summary
                  data-document-field="title"
                  className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
                >
                  定義書の情報
                </summary>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm">
                  <DocumentMeta
                    label="対象システム"
                    field="target_system_name"
                    value={document.target_system_name ?? "-"}
                  />
                  <DocumentMeta
                    label="クライアント"
                    field="client_name"
                    value={document.client_name ?? "-"}
                  />
                  <DocumentMeta
                    label="ベンダー"
                    field="vendor_name"
                    value={document.vendor_name ?? "-"}
                  />
                </dl>
              </details>

              <div id="document-purpose" className="scroll-mt-24">
                <ReviewablePreviewBlock
                  anchor={{
                    scope: "document_preview",
                    source_view: "requirement_document_overview_tab",
                    preview_target_type: "document",
                    preview_target_id: documentId,
                    document_id: documentId,
                    document_version: document.version,
                    field: "purpose",
                    quote: "",
                    label: "目的",
                  }}
                  onText={updatePreviewText}
                  onSelectTargetAnchor={selectCommentAnchor}
                  className="flex flex-col gap-3"
                >
                  <h2 className="border-b pb-2 text-xl font-semibold tracking-normal">
                    目的
                  </h2>
                  <div className="whitespace-pre-wrap text-sm leading-7">
                    <MarkdownBodyText
                      value={document.purpose || "目的は未設定です。"}
                    />
                  </div>
                </ReviewablePreviewBlock>
              </div>

              <DocumentObjectives projectId={projectId} document={document} />

              {sortedSections.map((section) => (
                <div
                  className="flex min-w-0 scroll-mt-24 flex-col gap-2"
                  key={section.id}
                  id={`chapter-${section.id}`}
                >
                  {edits[section.id] ? (
                    <>
                      <h2 className="border-b pb-2 text-xl font-semibold break-words">
                        {section.title}
                      </h2>
                      <SectionBodyEditor
                        projectId={projectId}
                        documentId={documentId}
                        sectionId={section.id}
                        canUpdate={canUpdate}
                        currentVersion={section.version}
                      />
                    </>
                  ) : (
                    <>
                      {canUpdate && scope ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="self-end"
                          disabled={reordering}
                          aria-label={`${section.title}の本文を編集`}
                          onClick={() => {
                            sectionEditBuffer.begin(scope, section);
                            requestAnimationFrame(() =>
                              window.document
                                .getElementById(`section-body-${section.id}`)
                                ?.focus({ preventScroll: true }),
                            );
                          }}
                        >
                          <PencilIcon data-icon="inline-start" />
                          編集
                        </Button>
                      ) : null}
                      <DocumentPreviewSection
                        documentPath={documentPath}
                        documentId={documentId}
                        documentVersion={document.version}
                        sectionId={section.id}
                        title={section.title}
                        content={section.content ?? ""}
                        sectionVersion={section.version}
                        requirements={requirements.filter(
                          (requirement) =>
                            requirement.section_id === section.id,
                        )}
                        onText={updatePreviewText}
                        onSelectTargetAnchor={selectCommentAnchor}
                      />
                    </>
                  )}
                </div>
              ))}
              {unassignedRequirements.length ? (
                <div id="unassigned-requirements" className="scroll-mt-24">
                  <DocumentPreviewSection
                    documentPath={documentPath}
                    documentId={documentId}
                    documentVersion={document.version}
                    title="セクション未設定"
                    content=""
                    requirements={unassignedRequirements}
                    onText={updatePreviewText}
                    onSelectTargetAnchor={selectCommentAnchor}
                  />
                </div>
              ) : null}
              {!sortedSections.length && !unassignedRequirements.length ? (
                <p className="text-sm text-muted-foreground">
                  章と要件はまだありません。
                </p>
              ) : null}
            </article>
          )}
        </div>

        <aside
          ref={commentPanelRef}
          id={commentsId}
          aria-label="定義書コメント"
          tabIndex={-1}
          hidden={!commentsOpen}
          className={cn(
            "relative min-w-0 border-t border-border/60 pt-2",
            outlineOpen
              ? "@min-[48rem]/document-overview:col-span-full @min-[76rem]/document-overview:sticky @min-[76rem]/document-overview:top-20 @min-[76rem]/document-overview:col-span-1 @min-[76rem]/document-overview:border-s @min-[76rem]/document-overview:border-t-0 @min-[76rem]/document-overview:pt-0"
              : "@min-[61rem]/document-overview:sticky @min-[61rem]/document-overview:top-20 @min-[61rem]/document-overview:border-s @min-[61rem]/document-overview:border-t-0 @min-[61rem]/document-overview:pt-0",
          )}
        >
          {commentsOpen ? (
            <>
              <CommentPaneResizeHandle
                pane={commentsId}
                {...paneWidth}
                className={
                  outlineOpen
                    ? "hidden @min-[76rem]/document-overview:block"
                    : "hidden @min-[61rem]/document-overview:block"
                }
              />
              <SourceCommentTabs
                projectId={projectId}
                sourceKind="requirement_document"
                sourceId={documentId}
                internalRequest={internalCommentRequest}
                action={
                  <CommentIconButton
                    label="コメントを閉じる"
                    onClick={() => {
                      setCommentsOpen(false);
                      commentToggleRef.current?.focus();
                    }}
                  >
                    <PanelRightCloseIcon aria-hidden="true" />
                  </CommentIconButton>
                }
                className={cn(
                  "px-3",
                  outlineOpen
                    ? "@min-[76rem]/document-overview:h-[calc(100dvh-8rem)]"
                    : "@min-[61rem]/document-overview:h-[calc(100dvh-8rem)]",
                )}
              >
                <RequirementTargetCommentsSection
                  projectId={projectId}
                  targetType="document"
                  targetId={documentId}
                  title="コメント"
                  canComment={canComment}
                  selectedTargetAnchor={selectedTargetAnchor}
                  onTargetAnchorClick={handleTargetAnchorClick}
                  getTargetAnchorStatus={getTargetAnchorStatus}
                  onReanchor={(comment) => {
                    setReanchor({ comment });
                    setReanchorError(undefined);
                    scrollToRequirementContent(articleRef.current);
                  }}
                  anchorEditor={
                    reanchor ? (
                      <div className="flex flex-col gap-2 border-t p-3 text-sm">
                        <p role="status">
                          {reanchor.selection
                            ? "新しい引用箇所を確認してください。"
                            : "本文から新しい引用箇所を選択してください。"}
                        </p>
                        {reanchor.selection ? (
                          <blockquote className="border-s-2 ps-2 break-words">
                            {reanchor.selection.quote}
                          </blockquote>
                        ) : null}
                        <FormApiError error={reanchorError} />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!reanchor.selection || savingAnchor}
                            onClick={() => void confirmReanchor()}
                          >
                            引用箇所を更新
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={savingAnchor}
                            onClick={() => setReanchor(null)}
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : null
                  }
                  showTargetAnchorInput={false}
                  className="h-full"
                  contentClassName={cn(
                    "max-h-[55dvh] overflow-y-auto overscroll-contain",
                    outlineOpen
                      ? "@min-[76rem]/document-overview:max-h-none"
                      : "@min-[61rem]/document-overview:max-h-none",
                  )}
                  embedded
                />
              </SourceCommentTabs>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

type DocumentPreviewSectionProps = {
  documentPath: string;
  documentId: number;
  documentVersion: number;
  sectionId?: number;
  title: string;
  content: string;
  sectionVersion?: number;
  requirements: {
    id: number;
    requirement_code: string;
    title: string;
    requirement_type?: string | null;
    priority?: string | null;
    status?: string | null;
  }[];
  onText: (key: string, value: string) => void;
  onSelectTargetAnchor: (targetAnchor: PreviewQuote) => void;
};

function DocumentPreviewSection({
  documentPath,
  documentId,
  documentVersion,
  sectionId,
  title,
  content,
  sectionVersion,
  requirements,
  onText,
  onSelectTargetAnchor,
}: DocumentPreviewSectionProps) {
  const previewTargetType = sectionId ? "section" : "unassigned_requirements";
  const previewTargetId = sectionId ?? null;

  return (
    <ReviewablePreviewBlock
      anchor={{
        scope: "document_preview",
        source_view: "requirement_document_overview_tab",
        preview_target_type: previewTargetType,
        preview_target_id: previewTargetId,
        document_id: documentId,
        document_version: documentVersion,
        section_id: previewTargetId,
        section_version: sectionVersion,
        field: "section",
        quote: "",
        label: title,
      }}
      onText={onText}
      onSelectTargetAnchor={onSelectTargetAnchor}
      className="flex flex-col gap-4"
    >
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
          <h3 className="text-base font-semibold">関連する要件</h3>
          <ul className="divide-y border-y">
            {requirements.map((requirement) => (
              <li key={requirement.id}>
                <Link
                  href={`${documentPath}/items/${requirement.id}`}
                  className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm py-2.5 text-sm hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {requirement.requirement_code}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {requirement.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : content.trim() ? null : (
        <p className="text-sm text-muted-foreground">
          本文と要件はありません。
        </p>
      )}
    </ReviewablePreviewBlock>
  );
}

type ReviewablePreviewBlockProps = {
  anchor: RequirementReviewTargetAnchor & { document_version: number };
  onText: (key: string, value: string) => void;
  className?: string;
  children: ReactNode;
  onSelectTargetAnchor: (targetAnchor: PreviewQuote) => void;
};

function ReviewablePreviewBlock({
  anchor,
  onText,
  className,
  children,
  onSelectTargetAnchor,
}: ReviewablePreviewBlockProps) {
  const anchorKey = getRequirementReviewAnchorKey(anchor);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => onText(anchorKey, renderedText(element));
    update();
    const observer = new MutationObserver(update);
    observer.observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [anchorKey, onText]);

  const recordSelection = (element: HTMLElement) => {
    const selection = window.getSelection();
    const quote = quoteRenderedRange(element, selection);
    if (!quote) return;
    onSelectTargetAnchor({ ...anchor, ...quote });
    selection?.removeAllRanges();
  };

  return (
    <section
      ref={ref}
      className={cn("scroll-mt-24 rounded-md", className)}
      data-document-preview-anchor-key={anchorKey}
      onMouseUp={(event) => recordSelection(event.currentTarget)}
      onKeyUp={(event) => {
        if (event.key === "Shift") recordSelection(event.currentTarget);
      }}
    >
      {children}
    </section>
  );
}

function DocumentMeta({
  label,
  value,
  field,
}: {
  label: string;
  value: string;
  field?: string;
}) {
  return (
    <div
      data-document-field={field}
      className="grid scroll-mt-24 grid-cols-[7rem_minmax(0,1fr)] gap-2"
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function OutlineLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="block rounded-md px-2 py-2 text-sm break-words text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </a>
  );
}

function compatiblePreviewQuote(
  anchor: RequirementReviewTargetAnchor,
  current: string,
): RenderedQuote | null {
  if (!anchor.quote || typeof anchor.source_value !== "string") return null;
  if (anchor.anchor_format === "rendered-text-v1") {
    if (
      typeof anchor.start_offset !== "number" ||
      typeof anchor.end_offset !== "number" ||
      typeof anchor.prefix !== "string" ||
      typeof anchor.suffix !== "string"
    )
      return null;
    return {
      anchor_format: anchor.anchor_format,
      offset_unit: "unicode_code_point",
      quote: anchor.quote,
      source_value: anchor.source_value,
      start_offset: anchor.start_offset,
      end_offset: anchor.end_offset,
      prefix: anchor.prefix,
      suffix: anchor.suffix,
    };
  }
  const source = normalizeReviewText(anchor.source_value);
  const quote = normalizeReviewText(anchor.quote);
  const start = source.indexOf(quote);
  if (
    !quote ||
    source !== current ||
    start < 0 ||
    start !== source.lastIndexOf(quote)
  )
    return null;
  const offset = Array.from(source.slice(0, start)).length;
  return {
    anchor_format: "rendered-text-v1",
    offset_unit: "unicode_code_point",
    quote,
    source_value: source,
    start_offset: offset,
    end_offset: offset + Array.from(quote).length,
    prefix: "",
    suffix: "",
  };
}
