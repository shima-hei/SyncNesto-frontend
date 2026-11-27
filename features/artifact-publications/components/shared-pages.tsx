"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Folder,
  Folders,
  House,
  Inbox,
  LogOut,
  MessagesSquare,
  Settings,
} from "lucide-react";
import { SharedAttachments } from "./shared-attachments";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { displayDate } from "@/features/artifact-releases/lib/display";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import type { SharedPublicationsSharedPublicationsGetParams } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/error";
import { announceSharedAuthChange } from "@/lib/auth/shared-access-events";
import { listShared } from "../lib/access-api";
import { PublicationBody } from "./publication-content";
import { loadSharedContent } from "../lib/load-shared-content";
import { useFreshShared } from "../hooks/use-fresh-shared";
import { SharedDecisionLists } from "./shared-decision-lists";
import { SharedNotificationsLink } from "@/features/notifications/components/shared-notifications";
import { ThemeSwitcher } from "@/components/shared/display/theme-switcher";
import { cn } from "@/lib/utils";
import { PublicationComments } from "./publication-comments";
import type { PublicationQuote } from "../lib/publication-quote";

const workspaceLinks = [
  ["/shared", "ホーム", House],
  ["/shared/decisions", "確認・承認", Inbox],
  ["/shared/publications", "共有資料", Folders],
  ["/shared/comments", "コメント", MessagesSquare],
  ["/shared/projects", "参加案件", Folder],
  ["/shared/account", "アカウント設定", Settings],
] as const;

export function SharedShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { logout, isPending } = useLogout();
  const pathname = usePathname();
  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]">
      <a
        className="sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:bg-background focus:p-3"
        href="#guest-main"
      >
        本文に移動
      </a>
      <header className="border-b bg-sidebar text-sidebar-foreground lg:border-r lg:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:px-3 lg:py-5">
          <Link className="px-2 font-semibold" href="/shared" prefetch={false}>
            Syncnesto
          </Link>
          <div className="flex flex-wrap items-center gap-1 lg:order-last lg:border-t lg:pt-3">
            <SharedNotificationsLink />
            <span className="min-w-0 break-words text-sm text-muted-foreground">
              {user?.name}
            </span>
            <ThemeSwitcher />
            <Button
              aria-label="ログアウト"
              title="ログアウト"
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                announceSharedAuthChange();
                void logout();
              }}
            >
              <LogOut />
            </Button>
          </div>
          <nav aria-label="ゲストワークスペース" className="w-full">
            <ul className="flex flex-wrap gap-1 lg:flex-col">
              {workspaceLinks.map(([href, label, Icon]) => {
                const active =
                  pathname === href ||
                  (href !== "/shared" && pathname.startsWith(href + "/"));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring",
                        active &&
                          "bg-sidebar-accent font-semibold underline underline-offset-4",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main
        id="guest-main"
        tabIndex={-1}
        className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-6 md:px-8"
      >
        {children}
      </main>
    </div>
  );
}

function SharedFailure({
  error,
  refresh,
}: {
  error: unknown;
  refresh: () => Promise<void>;
}) {
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <Alert>
      <AlertTitle>
        {missing
          ? "現在この内容を閲覧できません"
          : "接続・閲覧許可を確認してください"}
      </AlertTitle>
      <AlertDescription>
        公開状態・期限・ログイン中の本人を確認して、再読み込みしてください。以前の本文は表示しません。
        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          再読み込み
        </Button>
      </AlertDescription>
    </Alert>
  );
}

type SharedKind = NonNullable<
  SharedPublicationsSharedPublicationsGetParams["kind"]
>;
const kinds: { value: SharedKind; label: string }[] = [
  { value: "requirement_document", label: "要件定義書" },
  { value: "requirement", label: "個別要件" },
  { value: "specification", label: "設計" },
  { value: "test_design", label: "テスト設計" },
];
const ownDecisionLabels = {
  pending: "要対応",
  responded: "回答済み",
  none: "依頼なし",
} as const;

export function SharedDecisions({
  participationId,
}: {
  participationId?: string;
}) {
  return (
    <>
      {!participationId && (
        <h1 className="text-2xl font-semibold tracking-tight">確認・承認</h1>
      )}
      <SharedDecisionLists
        key={participationId ?? "all"}
        participationId={participationId}
        returnTo={
          participationId
            ? `/shared/projects/${participationId}?tab=decisions`
            : "/shared/decisions"
        }
      />
    </>
  );
}

export function SharedPublicationsList({
  participationId,
  embedded = false,
  preview = false,
}: {
  participationId?: string;
  embedded?: boolean;
  preview?: boolean;
}) {
  const [q, setQ] = useUrlFilterState("q", "");
  const [kind, setKind] = useUrlFilterState("kind", "all");
  const [cursor, setCursor] = useUrlFilterState("cursor", "");
  const [input, setInput] = useState(q);
  const chosen = kinds.find((item) => item.value === kind)?.value;
  const load = useCallback(
    (signal: AbortSignal) =>
      listShared(
        {
          q: preview ? undefined : q,
          kind: preview ? undefined : chosen,
          cursor: preview ? undefined : cursor || undefined,
          page_size: preview ? 5 : 20,
          participation_id: participationId,
        },
        { signal },
      ),
    [q, chosen, cursor, participationId, preview],
  );
  const contentRoot = useRef<HTMLDivElement>(null);
  const setMasked = useCallback((hidden: boolean) => {
    if (contentRoot.current) contentRoot.current.hidden = hidden;
  }, []);
  const data = useFreshShared(
    JSON.stringify([q, chosen, cursor, participationId, preview]),
    load,
    setMasked,
  );
  const { value: expiringList, refresh: refreshList } = data;
  useEffect(() => {
    if (!expiringList?.items.length) return;
    const deadline = Math.min(
      ...expiringList.items.map((item) =>
        Math.min(
          Date.parse(item.expires_at),
          item.decision_refresh_at
            ? Date.parse(item.decision_refresh_at)
            : Infinity,
        ),
      ),
    );
    const timer = window.setTimeout(
      () => void refreshList(),
      Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [expiringList, refreshList]);
  return (
    <>
      {preview ? null : embedded ? (
        <h2 className="text-base font-semibold">共有資料</h2>
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight">共有資料</h1>
      )}
      {!preview && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setCursor("");
            setQ(input);
          }}
        >
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor="shared-search">名前から探す</FieldLabel>
            <Input
              id="shared-search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={200}
            />
          </Field>
          <Field className="min-w-40">
            <FieldLabel>内容の種類</FieldLabel>
            <Select
              value={kind}
              onValueChange={(value) => {
                setCursor("");
                setKind(value);
              }}
            >
              <SelectTrigger aria-label="内容の種類">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">すべて</SelectItem>
                  {kinds.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit">検索</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void data.refresh()}
          >
            再読み込み
          </Button>
        </form>
      )}
      <div ref={contentRoot} className="flex min-w-0 flex-col gap-4">
        {data.error ? (
          <SharedFailure error={data.error} refresh={data.refresh} />
        ) : !data.value ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            {!preview && (
              <p className="text-sm text-muted-foreground">
                現在閲覧できる内容 {data.value.total}件
              </p>
            )}
            {!data.value.items.length ? (
              <Alert>
                <AlertTitle>表示できる共有内容はありません</AlertTitle>
                <AlertDescription>
                  公開元への確認が必要な場合は、ログイン中の本人と公開期限を確認してください。
                </AlertDescription>
              </Alert>
            ) : (
              <div
                role="region"
                aria-label="共有資料の一覧"
                tabIndex={0}
                className="overflow-x-auto rounded-md border focus-visible:outline-2 focus-visible:outline-ring"
              >
                <table
                  className={cn(
                    "w-full text-left text-sm",
                    preview ? "min-w-[37rem]" : "min-w-[43rem]",
                  )}
                >
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th scope="col" className="p-3 font-medium">
                        資料名
                      </th>
                      {!preview && (
                        <th scope="col" className="p-3 font-medium">
                          自分の対応状況
                        </th>
                      )}
                      <th scope="col" className="p-3 font-medium">
                        資料種別
                      </th>
                      {!embedded && (
                        <th scope="col" className="p-3 font-medium">
                          案件
                        </th>
                      )}
                      <th scope="col" className="p-3 font-medium">
                        固定日時
                      </th>
                      <th scope="col" className="p-3 font-medium">
                        共有日
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.value.items.map((item) => (
                      <tr key={item.id}>
                        <th scope="row" className="p-3 font-medium">
                          <Link
                            prefetch={false}
                            className="break-words font-semibold underline-offset-4 hover:underline"
                            href={`/shared/publications/${item.id}`}
                          >
                            {item.title}
                          </Link>
                        </th>
                        {!preview && (
                          <td
                            className={cn(
                              "whitespace-nowrap p-3",
                              item.own_decision_status === "pending" &&
                                "font-semibold",
                            )}
                          >
                            {item.own_decision_status
                              ? ownDecisionLabels[item.own_decision_status]
                              : "追加認証後に表示"}
                          </td>
                        )}
                        <td className="p-3">
                          {item.source_kinds
                            .map(
                              (value) =>
                                kinds.find((kind) => kind.value === value)
                                  ?.label ?? value,
                            )
                            .join("、")}
                        </td>
                        {!embedded && (
                          <td className="p-3">
                            {item.public_project_name || "公開名未設定"}
                          </td>
                        )}
                        <td className="p-3 tabular-nums">
                          {displayDate(item.captured_at)}
                        </td>
                        <td className="p-3 tabular-nums">
                          {displayDate(item.shared_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!preview && (
              <div className="flex gap-2">
                {cursor ? (
                  <Button variant="outline" onClick={() => setCursor("")}>
                    先頭へ戻る
                  </Button>
                ) : null}
                {data.value.next_cursor ? (
                  <Button
                    variant="outline"
                    onClick={() => setCursor(data.value!.next_cursor!)}
                  >
                    次へ
                  </Button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function SharedPublicationDetail({
  identity,
  threadId,
}: {
  identity: string;
  threadId?: string;
}) {
  const load = useCallback(
    (signal: AbortSignal) => loadSharedContent(identity, signal),
    [identity],
  );
  const contentRoot = useRef<HTMLDivElement>(null);
  const setMasked = useCallback((hidden: boolean) => {
    if (contentRoot.current) contentRoot.current.hidden = hidden;
  }, []);
  const data = useFreshShared(identity, load, setMasked);
  const [canQuote, setCanQuote] = useState(false);
  const [draftQuote, setDraftQuote] = useState<{
    revision: string;
    quote: PublicationQuote;
  }>();
  const revision = data.value?.metadata.authorization_revision;
  const setQuote = useCallback(
    (quote: PublicationQuote | undefined) => {
      setDraftQuote(quote && revision ? { revision, quote } : undefined);
    },
    [revision],
  );
  const lastAnchor = useRef("");
  useEffect(() => {
    if (!data.value) return;
    const anchor = window.location.hash.slice(1);
    if (
      !/^(?:public-node-[a-f0-9-]{36}|public-field-[a-f0-9-]{36}-[a-z_]{1,40}|shared-comments)$/i.test(
        anchor,
      ) ||
      lastAnchor.current === anchor
    )
      return;
    const target = document.getElementById(anchor);
    if (target) {
      target.scrollIntoView();
      lastAnchor.current = anchor;
    }
  }, [data.value]);
  const { value: expiringContent, refresh: refreshContent } = data;
  useEffect(() => {
    if (!expiringContent) return;
    const deadline = Date.parse(expiringContent.metadata.expires_at);
    const timer = window.setTimeout(
      () => void refreshContent(),
      Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [expiringContent, refreshContent]);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href="/shared/publications" prefetch={false}>
            共有一覧へ戻る
          </Link>
        </Button>
        <Button variant="outline" onClick={() => void data.refresh()}>
          閲覧許可を再確認
        </Button>
      </div>
      <div ref={contentRoot} className="flex min-w-0 flex-col gap-6">
        {data.error ? (
          <SharedFailure error={data.error} refresh={data.refresh} />
        ) : !data.value ? (
          <>
            <h1 className="text-lg font-semibold">
              閲覧許可と本文全体を確認しています
            </h1>
            <Skeleton className="h-40" />
          </>
        ) : (
          <>
            <div>
              <h1 className="break-words text-xl font-semibold">
                {data.value.metadata.content.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {displayDate(data.value.metadata.content.captured_at)}
                時点の固定内容 · 閲覧期限{" "}
                {displayDate(data.value.metadata.expires_at)}
              </p>
            </div>
            <Alert>
              <AlertTitle>共有された固定内容の確認</AlertTitle>
              <AlertDescription>
                目的・受け入れ条件と設計・テストの内容を確認してください。元の編集内容が更新されても、この固定内容は変わりません。あなたへの判断依頼がある場合は、依頼を開いて判断します。
              </AlertDescription>
            </Alert>
            <SharedDecisionLists
              key={identity}
              publicationId={identity}
              returnTo={`/shared/publications/${identity}${threadId ? `?thread=${threadId}#shared-comments` : ""}`}
            />
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
              <div className="grid min-w-0 gap-5">
                <PublicationBody
                  sharedPublicationId={identity}
                  authorizationRevision={
                    data.value.metadata.authorization_revision
                  }
                  key={data.value.metadata.authorization_revision}
                  nodes={data.value.nodes}
                  publicationId={`${identity}:${data.value.metadata.authorization_revision}`}
                  onQuote={canQuote && !threadId ? setQuote : undefined}
                />
                <SharedAttachments
                  key={`${identity}:${data.value.metadata.authorization_revision}:files`}
                  publicationId={identity}
                  files={data.value.metadata.content.files}
                  downloadAllowed={data.value.downloadAllowed}
                  revision={data.value.metadata.authorization_revision}
                  signal={data.operationSignal}
                />
              </div>
              <PublicationComments
                key={revision}
                publicationId={identity}
                threadId={threadId}
                nodes={data.value.nodes}
                quote={
                  draftQuote?.revision === revision
                    ? draftQuote?.quote
                    : undefined
                }
                onQuoteChange={setQuote}
                onCanPostChange={setCanQuote}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
