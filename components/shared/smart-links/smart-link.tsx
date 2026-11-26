"use client";

import { ChevronDownIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { UserDisplay } from "@/components/shared/display/user-avatar";
import { StatusIndicator } from "@/components/shared/display/status-badge";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/features/tasks/components/shared/task-badges";
import {
  RequirementDocumentStatusBadge,
  RequirementPriorityBadge,
  RequirementStatusBadge,
} from "@/features/requirements/components/shared/requirement-badges";
import { RequirementItemReviewBadge } from "@/features/requirements/components/review/requirement-item-workflow";
import { reviewRequestStatus } from "@/features/requirements/lib/requirement-workflow-review";
import type { SmartLinkRead } from "@/lib/api/generated/model/smartLinkRead";
import {
  readRequirementItemWorkflowStatesProjectsProjectIdRequirementWorkflowItemStatesGet as readItemStates,
  readRequirementReviewManagementProjectsProjectIdRequirementDocumentsDocumentIdReviewManagementGet as readReviewManagement,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { specificationLinksProjectsProjectIdSpecificationsSpecificationIdLinksGet as readSpecificationLinks } from "@/lib/api/generated/specifications/specifications";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { parseSmartLink, smartLinkKey } from "@/lib/smart-links/reference";
import type { LinkDisplay } from "@/lib/smart-links/markup";
import {
  useSmartLink,
  useSmartLinkScope,
} from "@/lib/smart-links/use-smart-link";
import { smartLinkKind } from "./smart-link-kind";

const noopSubscribe = () => () => {};
const emptyOrigin = () => "";
const currentOrigin = () => window.location.origin;

export function useSmartLinkOrigin() {
  return useSyncExternalStore(noopSubscribe, currentOrigin, emptyOrigin);
}

const linkStyle =
  "text-[var(--status-info-fg)] underline decoration-current/35 underline-offset-2 [overflow-wrap:anywhere] hover:decoration-current focus-visible:outline-ring";

export function SmartLink({
  href,
  children,
  display = "auto",
  live = false,
  source,
  title,
}: {
  href: string;
  children?: ReactNode;
  display?: LinkDisplay;
  live?: boolean;
  source?: string;
  title?: string;
}) {
  const origin = useSmartLinkOrigin();
  const { scope, tenantId } = useSmartLinkScope();
  const pathname = usePathname();
  const projectPage = /^\/projects\/joined\/\d+(?:\/|$)/.test(pathname);
  const savedPage =
    /^\/projects\/joined\/\d+\/(?:artifact-publications|artifact-releases|fixed-approvals|requirement-verifications|requirement-verdicts|requirement-workflow)(?:\/|$)/.test(
      pathname,
    );
  const candidate =
    live && projectPage && !savedPage && origin && scope
      ? parseSmartLink(href, origin)
      : null;
  const parsed =
    candidate &&
    (candidate.tenantId === undefined || candidate.tenantId === tenantId)
      ? candidate
      : null;
  const [open, setOpen] = useState(false);
  const [urlOverride, setUrlOverride] = useState<boolean | null>(null);
  const showUrl = urlOverride ?? display === "url";
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapper = useRef<HTMLSpanElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLAnchorElement>(null);
  const focusSummary = useRef(false);
  const cardId = useId();
  const resolved = useSmartLink(parsed, !showUrl || open);
  const details = useSmartLink(parsed, open, true);

  const item = parsed && !resolved.isError ? resolved.data : null;
  const kind = item ? smartLinkKind(item) : null;
  const target = parsed?.localHref ?? href;
  const external = /^https?:\/\//i.test(target);
  const label = showUrl
    ? href
    : display === "label"
      ? children || href
      : item
        ? [item.code, item.title].filter(Boolean).join(" ")
        : children || href;

  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  const schedule = (value: boolean) => {
    clear();
    timer.current = setTimeout(() => setOpen(value), value ? 240 : 220);
  };
  const retainFocus = (related: EventTarget | null) =>
    related instanceof Node &&
    (wrapper.current?.contains(related) || card.current?.contains(related));
  const openSummary = () => {
    clear();
    if (open) {
      card.current?.querySelector("button")?.focus();
    } else {
      focusSummary.current = true;
      setOpen(true);
    }
  };
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const link = (
    <a
      ref={anchor}
      href={target}
      data-link-source={source}
      title={title}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-details={parsed && open ? cardId : undefined}
      className={linkStyle}
      onFocus={parsed ? () => schedule(true) : undefined}
      onKeyDown={
        parsed
          ? (event) => {
              if (event.key !== "ArrowDown") return;
              event.preventDefault();
              openSummary();
            }
          : undefined
      }
      onClick={() => setOpen(false)}
    >
      {kind && !showUrl ? (
        <kind.icon
          className="me-1 inline size-[1em] align-[-0.12em]"
          aria-hidden="true"
        />
      ) : null}
      {label}
    </a>
  );
  if (!parsed) return link;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          ref={wrapper}
          className="group/smart"
          onPointerEnter={(event) =>
            event.pointerType !== "touch" && schedule(true)
          }
          onPointerLeave={(event) => {
            if (
              event.pointerType !== "touch" &&
              !retainFocus(document.activeElement)
            )
              schedule(false);
          }}
          onBlur={(event) => {
            if (!retainFocus(event.relatedTarget)) schedule(false);
          }}
        >
          {link}
          <button
            type="button"
            aria-label="リンクの概要"
            aria-controls={cardId}
            aria-expanded={open}
            onClick={(event) => {
              if (event.detail === 0) {
                openSummary();
              } else {
                clear();
                setOpen((value) => !value);
              }
            }}
            className="ms-0.5 inline-flex size-5 items-center justify-center rounded-sm align-middle text-muted-foreground opacity-0 hover:bg-muted focus-visible:opacity-100 focus-visible:outline-ring group-hover/smart:opacity-100 [@media(hover:none)]:size-7 [@media(hover:none)]:opacity-100"
          >
            <ChevronDownIcon className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      </PopoverAnchor>
      <PopoverContent
        ref={card}
        id={cardId}
        aria-label="リンクの概要"
        align="start"
        sideOffset={5}
        collisionPadding={10}
        onPointerEnter={clear}
        onPointerLeave={() => {
          if (!retainFocus(document.activeElement)) schedule(false);
        }}
        onBlur={(event) => {
          if (!retainFocus(event.relatedTarget)) schedule(false);
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (focusSummary.current)
            card.current?.querySelector("button")?.focus();
          focusSummary.current = false;
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={() => {
          clear();
          if (card.current?.contains(document.activeElement))
            anchor.current?.focus();
          clear();
        }}
        className="w-80 max-w-[calc(100vw-1.25rem)] gap-0 overflow-hidden p-0"
      >
        {details.isFetching ? (
          <p className="p-3 text-xs text-muted-foreground">概要を読み込み中…</p>
        ) : details.data && !details.isError ? (
          <PreviewBody item={details.data} href={target} />
        ) : (
          <p className="p-3 text-xs text-muted-foreground">
            リンク先の概要を表示できません。
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-1 border-t px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard
                .writeText(
                  href.startsWith("/") ? new URL(href, origin).href : href,
                )
                .then(() => toast.success("URLをコピーしました"))
                .catch(() => toast.error("URLをコピーできませんでした"));
            }}
          >
            <CopyIcon aria-hidden="true" />
            URLをコピー
          </Button>
          {item ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUrlOverride(!showUrl)}
            >
              {showUrl
                ? display === "label"
                  ? "ラベルを表示"
                  : "インライン表示"
                : "元のURLを表示"}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PreviewBody({ item, href }: { item: SmartLinkRead; href: string }) {
  const { icon: KindIcon, label } = smartLinkKind(item);
  const { scope } = useSmartLinkScope();
  const details = item.preview;
  const supplementary = useQuery({
    queryKey: ["smart-link-preview-fields", scope, smartLinkKey(item)],
    enabled: Boolean(
      scope &&
      ["requirement", "requirement_document", "specification"].includes(
        item.kind,
      ),
    ),
    staleTime: 10_000,
    gcTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const project = item.project_id;
      const id = Number(item.id);
      if (item.kind === "requirement") {
        const [current] = await readItemStates(
          project,
          { requirement_ids: [id] },
          { signal },
        );
        return { kind: "item" as const, review: current?.review };
      }
      if (item.kind === "requirement_document") {
        const { current_review, formal_approval } = await readReviewManagement(
          project,
          id,
          { page_size: 1 },
          { signal },
        );
        return {
          kind: "document" as const,
          review: current_review?.status,
          approval: formal_approval?.status,
        };
      }
      const links = await readSpecificationLinks(project, id, { signal });
      return {
        kind: "specification" as const,
        requirementCount: links.filter(
          (link) => link.target_type === "requirement",
        ).length,
      };
    },
  });
  const fields: [string, ReactNode][] = [];
  if (details?.requirement_type)
    fields.push([
      "種別",
      details.requirement_type === "functional"
        ? "機能要件"
        : details.requirement_type === "non_functional"
          ? "非機能要件"
          : details.requirement_type,
    ]);
  if (
    details?.assignee ||
    item.kind === "task" ||
    item.kind === "requirement"
  ) {
    fields.push([
      item.kind === "test_case" ? "実行者" : "担当者",
      <UserDisplay
        key="assignee"
        name={details?.assignee?.name}
        src={details?.assignee?.avatar_url}
      />,
    ]);
  }
  if (item.kind === "task")
    fields.push([
      "終了予定日",
      details?.due_date ? formatDate(details.due_date) : "未設定",
    ]);
  if (details?.test_item_count != null)
    fields.push(["テスト項目", `${details.test_item_count}件`]);
  if (details?.actual_result) fields.push(["結果", details.actual_result]);
  if (details?.file_type) fields.push(["ファイル形式", details.file_type]);
  if (
    details?.updated_at &&
    (item.kind === "document" || item.kind === "document_attachment")
  ) {
    fields.push(["更新日時", formatDateTime(details.updated_at)]);
  }
  const extra =
    supplementary.isFetching || supplementary.isError
      ? undefined
      : supplementary.data;
  if (extra?.kind === "item" && extra.review) {
    fields.push([
      "レビュー状況",
      <RequirementItemReviewBadge key="review" review={extra.review} />,
    ]);
  } else if (extra?.kind === "document") {
    if (extra.review)
      fields.push(["レビュー状況", reviewRequestStatus[extra.review]]);
    if (extra.approval) {
      fields.push([
        "正式承認",
        extra.approval === "requested"
          ? "承認待ち"
          : reviewRequestStatus[extra.approval],
      ]);
    }
  } else if (extra?.kind === "specification") {
    fields.push(["関連要件", `${extra.requirementCount}件`]);
  }
  return (
    <div className="min-w-0 space-y-2 p-3 [overflow-wrap:anywhere]">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <KindIcon className="size-4" aria-hidden="true" />
        {item.project_name} / {label}
      </div>
      {item.code ? (
        <p className="text-xs text-muted-foreground">{item.code}</p>
      ) : null}
      <p className="text-base font-semibold leading-snug">{item.title}</p>
      {details?.status || details?.priority ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {item.kind === "task" ? (
            <>
              <TaskStatusBadge status={details.status} />
              <TaskPriorityBadge priority={details.priority} />
            </>
          ) : item.kind === "requirement" ? (
            <>
              <RequirementStatusBadge status={details.status} />
              <RequirementPriorityBadge priority={details.priority} />
            </>
          ) : item.kind === "requirement_document" ? (
            <RequirementDocumentStatusBadge status={details.status} />
          ) : details.status ? (
            <StatusIndicator
              tone={
                ["approved", "passed"].includes(details.status)
                  ? "success"
                  : details.status === "failed"
                    ? "danger"
                    : "neutral"
              }
            >
              {{
                draft: "下書き",
                in_review: "レビュー中",
                approved: "承認済み",
                passed: "合格",
                failed: "不合格",
                not_run: "未実施",
                blocked: "実施不可",
              }[details.status] ?? details.status}
            </StatusIndicator>
          ) : null}
        </div>
      ) : null}
      {fields.length ? (
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2 border-t pt-2 text-xs">
          {fields.map(([name, value]) => (
            <div className="contents" key={name}>
              <dt className="text-muted-foreground">{name}</dt>
              <dd className="min-w-0 text-right">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <a
        href={href}
        className={`flex items-center justify-between gap-2 pt-1 text-xs ${linkStyle}`}
      >
        {label}を開く{" "}
        <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
