"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  displayBytes,
  displayDate,
} from "@/features/artifact-releases/lib/display";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import type {
  PublicationNodeRead,
  SharedPublicationRead,
  SharedPublicationsSharedPublicationsGetParams,
} from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/error";
import { subscribeAuthSessionInvalid } from "@/lib/auth/session-events";
import {
  announceSharedAuthChange,
  sharedAuthChannel,
  SHARED_AUTH_EVENT,
  SHARED_AUTH_STORAGE_KEY,
} from "@/lib/auth/shared-access-events";
import {
  listShared,
  readShared,
  readSharedFiles,
  readSharedNodes,
} from "../lib/access-api";
import { PublicationBody } from "./publication-content";

export function SharedShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { logout, isPending } = useLogout();
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            className="font-semibold"
            href="/shared/publications"
            prefetch={false}
          >
            Syncnesto · 共有された内容
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              表示テーマを切替
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                announceSharedAuthChange();
                void logout();
              }}
            >
              ログアウト
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </div>
  );
}

function useFreshShared<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  setMasked: (hidden: boolean) => void,
) {
  const { user, refetchUser } = useAuth();
  const controller = useRef<AbortController | null>(null);
  const ticket = useRef(0);
  const [state, setState] = useState<{
    key: string;
    value?: T;
    error?: unknown;
  }>({ key });
  const mask = useCallback(() => {
    ticket.current += 1;
    controller.current?.abort();
    setMasked(true);
    setState({ key });
  }, [key, setMasked]);
  const refresh = useCallback(async () => {
    mask();
    if (document.visibilityState === "hidden") return;
    const current = ticket.current;
    const active = new AbortController();
    controller.current = active;
    try {
      const auth = await refetchUser();
      if (!auth.data || auth.error)
        throw auth.error ?? new Error("ログインを確認してください");
      if (active.signal.aborted || current !== ticket.current) return;
      const value = await load(active.signal);
      if (!active.signal.aborted && current === ticket.current)
        setState({ key, value });
    } catch (error) {
      if (!active.signal.aborted && current === ticket.current)
        setState({ key, error });
    }
  }, [key, load, mask, refetchUser]);
  useLayoutEffect(() => {
    setMasked(false);
  }, [state, setMasked]);
  useEffect(() => {
    const request = () => {
      void refresh();
    };
    const visible = () =>
      document.visibilityState === "hidden" ? mask() : request();
    const storage = (event: StorageEvent) => {
      if (event.key === SHARED_AUTH_STORAGE_KEY) request();
    };
    const channel = sharedAuthChannel();
    if (channel) channel.onmessage = request;
    const unsubscribe = subscribeAuthSessionInvalid(mask);
    window.addEventListener("focus", request);
    window.addEventListener("pageshow", request);
    window.addEventListener("pagehide", mask);
    window.addEventListener("offline", mask);
    window.addEventListener("online", request);
    window.addEventListener("storage", storage);
    window.addEventListener(SHARED_AUTH_EVENT, request);
    document.addEventListener("visibilitychange", visible);
    request();
    return () => {
      ticket.current += 1;
      controller.current?.abort();
      channel?.close();
      unsubscribe();
      window.removeEventListener("focus", request);
      window.removeEventListener("pageshow", request);
      window.removeEventListener("pagehide", mask);
      window.removeEventListener("offline", mask);
      window.removeEventListener("online", request);
      window.removeEventListener("storage", storage);
      window.removeEventListener(SHARED_AUTH_EVENT, request);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [mask, refresh, user?.id]);
  return {
    value: state.key === key ? state.value : undefined,
    error: state.key === key ? state.error : undefined,
    refresh,
  };
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
  { value: "specification", label: "画面・API設計" },
  { value: "test_design", label: "テスト設計" },
];

export function SharedPublicationsList() {
  const [q, setQ] = useUrlFilterState("q", "");
  const [kind, setKind] = useUrlFilterState("kind", "all");
  const [cursor, setCursor] = useUrlFilterState("cursor", "");
  const [input, setInput] = useState(q);
  const chosen = kinds.find((item) => item.value === kind)?.value;
  const load = useCallback(
    (signal: AbortSignal) =>
      listShared(
        { q, kind: chosen, cursor: cursor || undefined, page_size: 20 },
        { signal },
      ),
    [q, chosen, cursor],
  );
  const contentRoot = useRef<HTMLDivElement>(null);
  const setMasked = useCallback((hidden: boolean) => {
    if (contentRoot.current) contentRoot.current.hidden = hidden;
  }, []);
  const data = useFreshShared(
    JSON.stringify([q, chosen, cursor]),
    load,
    setMasked,
  );
  const { value: expiringList, refresh: refreshList } = data;
  useEffect(() => {
    if (!expiringList?.items.length) return;
    const deadline = Math.min(
      ...expiringList.items.map((item) => Date.parse(item.expires_at)),
    );
    const timer = window.setTimeout(
      () => void refreshList(),
      Math.max(0, Math.min(deadline - Date.now(), 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [expiringList, refreshList]);
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">共有された内容</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          あなたに許可された固定内容から、目的・要件・設計・テストを確認できます。
        </p>
      </div>
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
      <div ref={contentRoot} className="flex min-w-0 flex-col gap-4">
        {data.error ? (
          <SharedFailure error={data.error} refresh={data.refresh} />
        ) : !data.value ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              現在閲覧できる内容 {data.value.total}件
            </p>
            {!data.value.items.length ? (
              <Alert>
                <AlertTitle>表示できる共有内容はありません</AlertTitle>
                <AlertDescription>
                  公開元への確認が必要な場合は、ログイン中の本人と公開期限を確認してください。
                </AlertDescription>
              </Alert>
            ) : (
              <ul className="divide-y">
                {data.value.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 py-4">
                    <Link
                      prefetch={false}
                      className="break-words font-semibold underline-offset-4 hover:underline"
                      href={`/shared/publications/${item.id}`}
                    >
                      {item.title}
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      {item.source_kinds.map((value) => (
                        <Badge variant="secondary" key={value}>
                          {kinds.find((k) => k.value === value)?.label ?? value}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {displayDate(item.captured_at)}時点の固定内容 · 閲覧期限{" "}
                      {displayDate(item.expires_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
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
          </>
        )}
      </div>
    </>
  );
}

type SharedDetail = {
  metadata: SharedPublicationRead;
  nodes: PublicationNodeRead[];
};

export function SharedPublicationDetail({ identity }: { identity: string }) {
  const load = useCallback(
    async (signal: AbortSignal): Promise<SharedDetail> => {
      const metadata = await readShared(identity, { signal });
      const nodes: PublicationNodeRead[] = [];
      let cursor: string | undefined;
      do {
        const page = await readSharedNodes(
          identity,
          { page_size: 100, cursor },
          { signal },
        );
        if (
          page.authorization_revision !== metadata.authorization_revision ||
          page.total !== metadata.content.node_count
        )
          throw new Error("公開許可が変わりました");
        nodes.push(...page.items);
        cursor = page.next_cursor ?? undefined;
      } while (cursor);
      if (
        nodes.length !== metadata.content.node_count ||
        nodes.some((node, index) => node.ordinal !== index)
      )
        throw new Error("本文全体を取得できませんでした");
      const [files, latest] = await Promise.all([
        readSharedFiles(identity, { signal }),
        readShared(identity, { signal }),
      ]);
      if (
        files.authorization_revision !== metadata.authorization_revision ||
        latest.authorization_revision !== metadata.authorization_revision ||
        JSON.stringify(files.items) !== JSON.stringify(metadata.content.files)
      )
        throw new Error("公開許可が変わりました");
      return { metadata, nodes };
    },
    [identity],
  );
  const contentRoot = useRef<HTMLDivElement>(null);
  const setMasked = useCallback((hidden: boolean) => {
    if (contentRoot.current) contentRoot.current.hidden = hidden;
  }, []);
  const data = useFreshShared(identity, load, setMasked);
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
                目的・受け入れ条件と設計・テストの内容を確認してください。元の編集内容が更新されても、この固定内容は変わりません。この画面で合意・正式承認は行いません。
              </AlertDescription>
            </Alert>
            <PublicationBody
              key={data.value.metadata.authorization_revision}
              nodes={data.value.nodes}
              publicationId={`${identity}:${data.value.metadata.authorization_revision}`}
            />
            <section
              aria-label="共有された添付一覧"
              className="flex min-w-0 flex-col gap-3"
            >
              <h2 className="font-semibold">添付ファイル</h2>
              <ul className="flex flex-col gap-2">
                {data.value.metadata.content.files.map((file) => (
                  <li key={file.id} className="break-words text-sm">
                    {file.filename} · {displayBytes(file.byte_size)}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                {data.value.metadata.content.files.length
                  ? "この段階では添付の一覧を確認できます。ダウンロードは後続工程です。"
                  : "添付なし"}
              </p>
            </section>
          </>
        )}
      </div>
    </>
  );
}
