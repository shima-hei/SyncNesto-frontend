"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PanelLeftIcon,
  PanelRightIcon,
  PlusIcon,
  ScanIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import {
  canCreateDocument,
  canUpdateDocument,
} from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { formatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type {
  CollectionRead,
  CollectionInput,
  CollectionInputConfiguration,
  DatabaseConstraint,
  DatabaseRelationship,
  DesignEdge,
  DesignNode,
  PlacementInput,
} from "@/lib/api/generated/model";
import {
  createSpecification,
  listLinks,
  readSpecification,
  updateSpecification,
} from "../lib/api";
import {
  initialValues,
  kindLabels,
  relatedHref,
  specificationCode,
  specificationHref,
  specificationKeys,
  statusLabels,
  type Kind,
} from "../lib/specification";
import {
  createDesignCollection,
  designKey,
  readDesignCollections,
  readDesignDiagram,
  savePlacements,
  screenKinds,
  updateDesignCollection,
  updateMemberships,
} from "../lib/workspace";
import { asObject, asString } from "../lib/openapi-schema";
import { SpecificationPage } from "./specification-page";
import { ApiSetSettings } from "./workspace/api-set-settings";
import { DesignCanvas } from "./workspace/design-canvas";
import { ConstraintDetails } from "./workspace/design-details";
import { DesignNodeList } from "./workspace/design-node-list";
import { DesignOverview } from "./workspace/design-overview";
import { DesignReviewRequestDialog } from "./workspace/design-review-requests";
import { ScreenListTable } from "./workspace/screen-list-table";
import { DesignFormats, OpenApiImportPanel } from "./workspace/design-formats";

type View = "all" | Kind;
const labels: Record<View, string> = {
  all: "設計概要",
  screen: kindLabels.screen,
  api: kindLabels.api,
  database: kindLabels.database,
};
const selectClass = "h-8 min-w-0 rounded-md border bg-background px-2 text-sm";

export function SpecificationsPage({ projectId }: { projectId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("kind");
  const kind: View =
    raw === "screen" || raw === "api" || raw === "database" ? raw : "all";
  const navigate = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(next.size ? `${pathname}?${next}` : pathname, {
      scroll: false,
    });
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader title="設計" />
      <nav
        aria-label="設計ワークスペース"
        className="flex flex-wrap gap-0.5 border-b"
      >
        {(Object.keys(labels) as View[]).map((tab) => (
          <Button
            asChild
            key={tab}
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-none border-b-2 border-transparent",
              kind === tab && "border-primary font-semibold text-primary",
            )}
          >
            <Link
              href={`${pathname}${tab === "all" ? "" : `?kind=${tab}`}`}
              aria-current={kind === tab ? "page" : undefined}
            >
              {labels[tab]}
            </Link>
          </Button>
        ))}
      </nav>
      {kind === "all" ? (
        <DesignOverview projectId={projectId} />
      ) : (
        <DesignBrowser
          key={kind}
          projectId={projectId}
          kind={kind}
          initialGroup={params.get("group") ?? ""}
          initialView={params.get("view") ?? ""}
          onView={(view) => navigate({ view })}
        />
      )}
    </div>
  );
}

function DesignBrowser({
  projectId,
  kind,
  initialGroup,
  initialView,
  onView,
}: {
  projectId: number;
  kind: Kind;
  initialGroup: string;
  initialView: string;
  onView: (value: string) => void;
}) {
  const cache = useQueryClient();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canCreate = canCreateDocument(currentProjectRole);
  const canEdit = canUpdateDocument(currentProjectRole);
  const [group, setGroup] = useState(initialGroup);
  const [setId, setSetId] = useState("");
  const [q, setQ] = useState("");
  const [namespace, setNamespace] = useState("");
  const schema = useDeferredValue(namespace);
  const search = useDeferredValue(q);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [edge, setEdge] = useState<DesignEdge>();
  const [newConnection, setNewConnection] = useState<{
    targetId?: number;
    request: number;
  }>();
  const connectionRequest = useRef(0);
  const [connectionSaving, setConnectionSaving] = useState(false);
  const [name, setName] = useState("");
  const [creation, setCreation] = useState<{
    x?: number;
    y?: number;
    source?: number;
  } | null>(null);
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [logical, setLogical] = useState(false);
  const [apiSort, setApiSort] = useState("path");
  const [order, setOrder] = useState<"ascending" | "descending">("ascending");
  const [showStatus, setShowStatus] = useState(true);
  const [collectionEditor, setCollectionEditor] = useState<
    CollectionRead | "group" | "api_set" | "db_model" | null
  >(null);
  const view = initialView || (kind === "api" ? "tree" : "diagram");
  const screenList = kind === "screen" && view === "list";
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: designKey(projectId) }),
      cache.invalidateQueries({ queryKey: specificationKeys.all(projectId) }),
    ]);
  };
  const collections = useQuery({
    queryKey: [...designKey(projectId), "collections"],
    queryFn: () => readDesignCollections(projectId),
  });
  const groups =
    collections.data?.filter((item) => item.kind === "group") ?? [];
  const sets =
    collections.data?.filter(
      (item) => item.kind === (kind === "api" ? "api_set" : "db_model"),
    ) ?? [];
  const selectedSet = sets.find((item) => item.id === setId);
  const graph = useQuery({
    queryKey: [
      ...designKey(projectId),
      kind,
      group,
      setId,
      search,
      schema,
      page,
      view === "diagram",
    ],
    queryFn: () =>
      readDesignDiagram(projectId, {
        kind,
        group_id: group || undefined,
        collection_id: setId || undefined,
        include_references: view === "diagram",
        q: search,
        namespace: kind === "database" ? schema : undefined,
        page,
        page_size: 50,
      }),
    retry: false,
    enabled: !screenList && view !== "output",
  });
  const id = selected.size === 1 ? [...selected][0] : undefined;
  const nodes = graph.data?.nodes ?? [];
  const outsidePage = new Set(graph.data?.reference_ids ?? []);
  const matches = nodes.filter(
    (node) =>
      !outsidePage.has(node.id) &&
      (!group || node.group_ids?.includes(group)) &&
      (!setId || node.collection_id === setId),
  );
  const matchingIds = new Set(matches.map((node) => node.id));
  const edgeList = (graph.data?.edges ?? []).filter(
    (item) =>
      (kind !== "database" ||
        item.kind === (logical ? "logical" : "foreign_key")) &&
      (matchingIds.has(item.source_id) || matchingIds.has(item.target_id)),
  );
  const referenceIds = new Set(
    edgeList
      .flatMap((item) => [item.source_id, item.target_id])
      .filter((value) => !matchingIds.has(value)),
  );
  const diagram = nodes.filter(
    (node) =>
      !node.placement?.hidden &&
      (matchingIds.has(node.id) || referenceIds.has(node.id)),
  );
  const active = nodes.find((node) => node.id === id);
  const select = (value: number, multiple = false) => {
    setEdge(undefined);
    setNewConnection(undefined);
    setRight(true);
    if (!multiple) {
      setSelected(new Set([value]));
      return;
    }
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };
  const place = useMutation({
    mutationFn: (positions: PlacementInput[]) =>
      savePlacements(projectId, {
        group_id: group || null,
        placements: positions,
      }),
    onSuccess: refresh,
  });
  const create = useMutation({
    mutationFn: async ({
      title,
      asGroup,
    }: {
      title: string;
      asGroup: string;
    }) => {
      const { content } = initialValues(kind);
      if ((content.type === "api" || content.type === "database") && setId)
        content.collection_id = setId;
      if (content.type === "database" && namespace)
        content.namespace = namespace;
      const created = await createSpecification(projectId, {
        title,
        summary: "",
        content,
      });
      if (asGroup) {
        try {
          await updateMemberships(projectId, created.id, {
            version: created.version,
            group_ids: [asGroup],
          });
        } catch {
          return {
            row: created,
            partial:
              "設計を作成しました。グループへの登録はプロパティから再試行できます。",
          };
        }
      }
      try {
        if (
          creation?.x !== undefined &&
          creation.y !== undefined &&
          kind !== "api"
        ) {
          await savePlacements(projectId, {
            group_id: group || null,
            placements: [
              { specification_id: created.id, x: creation.x, y: creation.y },
            ],
          });
        }
        if (creation?.source && kind !== "api") {
          const source = await readSpecification(projectId, creation.source);
          if (source.content.type === "screen") {
            await updateSpecification(projectId, source.id, {
              title: source.title,
              summary: source.summary,
              version: source.version,
              content: {
                ...source.content,
                transitions: [
                  ...(source.content.transitions ?? []),
                  {
                    id: crypto.randomUUID(),
                    target_id: created.id,
                    name: title,
                  },
                ],
              },
            });
          }
        }
      } catch {
        return {
          row: created,
          partial:
            "設計を作成しました。配置または接続の保存を再試行してください。",
        };
      }
      return { row: created };
    },
    onSuccess: async ({ row }) => {
      setName("");
      setCreation(null);
      if (
        (graph.data?.total ?? 0) >= 50 ||
        (q && !row.title.toLowerCase().includes(q.toLowerCase()))
      ) {
        setPage(1);
        setQ(row.title);
      }
      select(row.id);
      await refresh();
    },
  });
  const createLabel =
    kind === "screen"
      ? "画面を追加"
      : kind === "api"
        ? "APIを追加"
        : "テーブルを追加";
  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (name.trim()) create.mutate({ title: name.trim(), asGroup: group });
  };
  const sorted = [...matches].sort((a, b) =>
    order === "ascending"
      ? a.title.localeCompare(b.title, "ja")
      : b.title.localeCompare(a.title, "ja"),
  );
  const reviewTargets = matches.filter(
    (design) => selected.has(design.id) && design.status !== "approved",
  );
  const content = (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
        <div
          className="flex flex-wrap items-center gap-1"
          aria-label="設計の表示形式"
        >
          {(kind === "screen"
            ? [
                ["diagram", "画面遷移図"],
                ["list", "画面一覧"],
              ]
            : kind === "api"
              ? [
                  ["tree", "APIツリー"],
                  ["output", "取込・出力"],
                ]
              : [
                  ["diagram", "ER図"],
                  ["list", "テーブル一覧"],
                  ["dictionary", "データ辞書"],
                  ["output", "DDL"],
                ]
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={view === key ? "secondary" : "ghost"}
              aria-pressed={view === key}
              onClick={() => onView(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {!screenList && canEdit && reviewTargets.length > 0 && (
            <DesignReviewRequestDialog
              projectId={projectId}
              defaults={reviewTargets}
            />
          )}
          {view === "diagram" && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="左ペイン"
                aria-pressed={left}
                onClick={() => setLeft((value) => !value)}
              >
                <PanelLeftIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="右ペイン"
                aria-pressed={right}
                onClick={() => setRight((value) => !value)}
              >
                <PanelRightIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={maximized ? "最大化を解除" : "最大化"}
                onClick={() => setMaximized((value) => !value)}
              >
                <ScanIcon />
              </Button>
            </>
          )}
          {canCreate && (
            <Button size="sm" onClick={() => setCreation({})}>
              <PlusIcon />
              {createLabel}
            </Button>
          )}
        </div>
      </div>
      {(creation || view === "list") && canCreate && (
        <form className="flex max-w-xl gap-2" onSubmit={saveName}>
          <Input
            aria-label="新しい設計の名前"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            autoFocus={Boolean(creation)}
            placeholder={
              creation?.source ? "新しい接続先の画面名" : "名前のみで仮登録"
            }
          />
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending || !name.trim()}
          >
            {createLabel}
          </Button>
          {creation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreation(null)}
            >
              取消
            </Button>
          )}
        </form>
      )}
      <FormApiError error={create.error ?? place.error} />
      {create.data?.partial && (
        <p role="status" className="text-sm">
          {create.data.partial}
        </p>
      )}
      {collectionEditor && (
        <CollectionEditor
          key={
            typeof collectionEditor === "string"
              ? collectionEditor
              : collectionEditor.id
          }
          projectId={projectId}
          editing={collectionEditor}
          groups={groups}
          onCancel={() => setCollectionEditor(null)}
          onSaved={async (item) => {
            setCollectionEditor(null);
            if (item.kind === "group") setGroup(item.id);
            else setSetId(item.id);
            await refresh();
          }}
        />
      )}
      {view === "output" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={selectClass}
              aria-label="対象セット・モデル"
              value={setId}
              onChange={(event) => setSetId(event.target.value)}
            >
              <option value="">既定</option>
              {sets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCollectionEditor(
                    selectedSet ?? (kind === "api" ? "api_set" : "db_model"),
                  )
                }
              >
                {selectedSet ? "設定を編集" : "セット・モデルを追加"}
              </Button>
            )}
          </div>
          {kind === "api" && canEdit && selectedSet && (
            <OpenApiImportPanel
              key={selectedSet.id}
              projectId={projectId}
              collection={selectedSet}
              onImported={() => void refresh()}
            />
          )}
          {kind !== "screen" && (
            <DesignFormats
              key={setId}
              projectId={projectId}
              kind={kind}
              collectionId={setId || undefined}
            />
          )}
        </div>
      ) : (
        <>
          {collections.error && <FormApiError error={collections.error} />}
          {!screenList && graph.error ? (
            <DataLoadError
              resourceName="設計"
              isRetrying={graph.isFetching}
              onRetry={() => void graph.refetch()}
            />
          ) : (
            <div
              className={cn(
                "min-w-0 overflow-hidden rounded-md border",
                view !== "list" && "flex flex-col lg:flex-row",
              )}
            >
              {(left || view !== "diagram") && (
                <aside
                  className={cn(
                    "min-w-0 space-y-3 bg-muted/20 p-3",
                    view !== "list" &&
                      "border-b lg:w-52 lg:max-w-[45%] lg:min-w-42 lg:shrink-0 lg:resize-x lg:overflow-auto lg:border-r lg:border-b-0",
                  )}
                >
                  <Input
                    aria-label="設計を検索"
                    placeholder="設計を検索"
                    value={q}
                    maxLength={200}
                    onChange={(event) => {
                      setPage(1);
                      setQ(event.target.value);
                    }}
                  />
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    機能グループ
                    <select
                      aria-label="機能グループ"
                      className={selectClass}
                      value={group}
                      onChange={(event) => {
                        setPage(1);
                        setGroup(event.target.value);
                      }}
                    >
                      <option value="">すべての機能</option>
                      {orderedGroups(groups).map(({ item, depth }) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >{`${"　".repeat(depth)}${item.name}`}</option>
                      ))}
                    </select>
                  </label>
                  {kind === "database" && (
                    <label className="flex flex-col gap-1 text-xs font-medium">
                      スキーマで絞り込む
                      <Input
                        value={namespace}
                        maxLength={63}
                        placeholder="すべてのスキーマ"
                        onChange={(event) => {
                          setNamespace(event.target.value);
                          setPage(1);
                          setSelected(new Set());
                        }}
                      />
                    </label>
                  )}
                  {canEdit && (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollectionEditor("group")}
                      >
                        ＋ グループ
                      </Button>
                      {group && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCollectionEditor(
                              groups.find((item) => item.id === group) ?? null,
                            )
                          }
                        >
                          編集
                        </Button>
                      )}
                    </div>
                  )}
                  {kind !== "screen" && (
                    <label className="flex flex-col gap-1 text-xs font-medium">
                      {kind === "api" ? "API仕様セット" : "DBモデル"}
                      <select
                        className={selectClass}
                        value={setId}
                        onChange={(event) => {
                          setSetId(event.target.value);
                          setPage(1);
                          setSelected(new Set());
                        }}
                      >
                        <option value="">すべて</option>
                        {sets.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {kind === "api" && (
                    <label className="flex flex-col gap-1 text-xs font-medium">
                      分類
                      <select
                        className={selectClass}
                        value={apiSort}
                        onChange={(event) => setApiSort(event.target.value)}
                      >
                        <option value="path">パス</option>
                        <option value="tag">タグ</option>
                        <option value="group">機能グループ</option>
                      </select>
                    </label>
                  )}
                  {view !== "list" && (
                    <DesignNodeList
                      nodes={matches}
                      selected={selected}
                      onSelect={select}
                      sort={apiSort}
                      groups={groups}
                      kind={kind}
                    />
                  )}
                </aside>
              )}
              <div className="min-w-0 flex-1">
                {screenList ? (
                  <ScreenListTable
                    projectId={projectId}
                    canEdit={canEdit}
                    canCreate={canCreate}
                    groups={groups}
                    groupId={group}
                    search={search}
                    page={page}
                    onPage={setPage}
                  />
                ) : graph.isPending ? (
                  <p className="p-4" role="status">
                    設計を読み込み中…
                  </p>
                ) : view === "diagram" && kind !== "api" ? (
                  <>
                    {kind === "database" && (
                      <div className="border-b p-2">
                        <Button
                          variant={logical ? "secondary" : "outline"}
                          size="sm"
                          disabled={connectionSaving}
                          onClick={() => {
                            setLogical((value) => !value);
                            setEdge(undefined);
                            setNewConnection(undefined);
                          }}
                        >
                          {logical
                            ? "論理名・論理リレーション"
                            : "物理名・外部キー"}
                        </Button>
                      </div>
                    )}
                    <DesignCanvas
                      projectId={projectId}
                      nodes={diagram}
                      edges={edgeList}
                      selected={selected}
                      onSelect={select}
                      onEdge={(item) => {
                        setNewConnection(undefined);
                        setEdge(item);
                        setRight(true);
                        setSelected(new Set([item.source_id]));
                      }}
                      onConnect={
                        canEdit
                          ? (sourceId, targetId) => {
                              select(sourceId);
                              connectionRequest.current += 1;
                              setNewConnection({
                                targetId,
                                request: connectionRequest.current,
                              });
                            }
                          : undefined
                      }
                      onPlace={(positions) => place.mutate(positions)}
                      onAdd={(position) => setCreation(position ?? {})}
                      referenceIds={referenceIds}
                      logical={logical}
                      busy={place.isPending || connectionSaving}
                      canEdit={canEdit}
                    />
                    {graph.data?.has_more_references && (
                      <p
                        role="status"
                        className="p-2 text-sm text-muted-foreground"
                      >
                        参照先が200件を超えています。グループや検索条件を変更すると接続を絞り込めます。
                      </p>
                    )}
                  </>
                ) : view === "tree" ? (
                  <div className="space-y-3 p-4">
                    <p className="text-sm text-muted-foreground">
                      {active
                        ? active.title
                        : "左側のツリーからAPIを選択してください。"}
                    </p>
                    {active && (
                      <SpecificationPage
                        projectId={projectId}
                        id={active.id}
                        inline
                      />
                    )}
                    {!matches.length && canCreate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreation({})}
                      >
                        最初のAPIを追加
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 overflow-x-auto p-3">
                    {view === "list" && (
                      <label className="text-sm">
                        <input
                          type="checkbox"
                          className="mr-2 accent-primary"
                          checked={showStatus}
                          onChange={(event) =>
                            setShowStatus(event.target.checked)
                          }
                        />
                        状態列
                      </label>
                    )}
                    <table className="w-full min-w-[38rem] text-left text-sm">
                      <thead className="border-b text-xs text-muted-foreground">
                        <tr>
                          <th className="p-2">ID</th>
                          <th aria-sort={order}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setOrder((value) =>
                                  value === "ascending"
                                    ? "descending"
                                    : "ascending",
                                )
                              }
                            >
                              設計名
                            </Button>
                          </th>
                          <th>識別子</th>
                          <th>
                            {view === "dictionary" ? "カラム" : "機能グループ"}
                          </th>
                          {showStatus && <th>状態</th>}
                          <th>更新日時</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sorted.map((node) => (
                          <tr key={node.id}>
                            <td className="p-2 font-mono text-xs">
                              {specificationCode(node)}
                            </td>
                            <td>
                              {canEdit && view === "list" ? (
                                <QuickTitle
                                  key={`${node.id}:${node.version}`}
                                  projectId={projectId}
                                  node={node}
                                  onSave={refresh}
                                />
                              ) : (
                                node.title
                              )}
                              <Link
                                href={specificationHref(projectId, node.id)}
                                className="text-xs text-primary underline-offset-4 hover:underline"
                              >
                                開く
                              </Link>
                            </td>
                            <td className="p-2 font-mono text-xs">
                              {node.identifier || "未設定"}
                            </td>
                            <td>
                              {view === "dictionary"
                                ? node.field_labels?.join(" / ")
                                : node.group_ids
                                    ?.map(
                                      (groupId) =>
                                        groups.find(
                                          (item) => item.id === groupId,
                                        )?.name,
                                    )
                                    .filter(Boolean)
                                    .join("、")}
                            </td>
                            {showStatus && <td>{statusLabels[node.status]}</td>}
                            <td className="text-xs text-muted-foreground">
                              {formatDateTime(node.updated_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!sorted.length && (
                      <p className="py-4 text-sm text-muted-foreground">
                        表示する設計はありません。
                      </p>
                    )}
                  </div>
                )}
              </div>
              {view === "diagram" && right && (
                <aside className="min-w-0 space-y-3 border-t p-3 lg:w-62 lg:max-w-[45%] lg:min-w-48 lg:shrink-0 lg:resize-x lg:overflow-auto lg:border-t-0 lg:border-l">
                  <h2 className="border-b pb-2 text-sm font-semibold">
                    {edge || newConnection
                      ? "接続プロパティ"
                      : "設計プロパティ"}
                  </h2>
                  {active ? (
                    <NodeInspector
                      key={`${active.id}:${edge?.id ?? ""}:${active.version}:${newConnection?.request ?? ""}:${logical}`}
                      projectId={projectId}
                      node={active}
                      groups={groups}
                      nodes={nodes}
                      logical={logical}
                      canEdit={canEdit}
                      onSave={async () => {
                        await refresh();
                        setNewConnection((current) =>
                          current?.request === newConnection?.request
                            ? undefined
                            : current,
                        );
                      }}
                      onConnectionSaving={setConnectionSaving}
                      edge={edge}
                      newConnection={newConnection}
                      onNewTarget={
                        canCreate && kind === "screen"
                          ? () => setCreation({ source: active.id })
                          : undefined
                      }
                      onPlacement={
                        referenceIds.has(active.id)
                          ? undefined
                          : () =>
                              place.mutate([
                                {
                                  specification_id: active.id,
                                  x: active.placement?.x ?? 38,
                                  y: active.placement?.y ?? 40,
                                  version: active.placement?.version ?? 0,
                                  hidden: !active.placement?.hidden,
                                },
                              ])
                      }
                      onReference={
                        referenceIds.has(active.id)
                          ? () => {
                              setPage(1);
                              setQ(active.title);
                              setGroup(active.group_ids?.[0] ?? "");
                              if (kind === "database") {
                                setSetId(active.collection_id ?? "");
                                setNamespace(active.subtype ?? "");
                              }
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      図または一覧で設計を選択
                    </p>
                  )}
                </aside>
              )}
            </div>
          )}
          {!screenList && !!graph.data && graph.data.total > 50 && (
            <DataPagination
              page={page}
              total={graph.data.total}
              pageSize={50}
              currentCount={matches.length}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
  return maximized ? (
    <div
      role="dialog"
      aria-label="設計図の最大表示"
      className="fixed inset-0 z-50 overflow-auto bg-background p-4"
    >
      {content}
    </div>
  ) : (
    content
  );
}

function orderedGroups(
  groups: CollectionRead[],
  parent: string | null = null,
  depth = 0,
): { item: CollectionRead; depth: number }[] {
  return groups
    .filter((item) => (item.parent_id ?? null) === parent)
    .flatMap((item) => [
      { item, depth },
      ...orderedGroups(groups, item.id, depth + 1),
    ]);
}

function CollectionEditor({
  projectId,
  editing,
  groups,
  onSaved,
  onCancel,
}: {
  projectId: number;
  editing: CollectionRead | CollectionInput["kind"];
  groups: CollectionRead[];
  onSaved: (item: CollectionRead) => Promise<void>;
  onCancel: () => void;
}) {
  const field = useId();
  const form = `${field}-settings`;
  const existing = typeof editing === "string" ? null : editing;
  const kind = typeof editing === "string" ? editing : editing.kind;
  const [name, setName] = useState(existing?.name ?? "");
  const [parent, setParent] = useState(existing?.parent_id ?? "");
  const [settings, setSettings] = useState(
    JSON.stringify(
      existing?.configuration ??
        (kind === "db_model" ? { product: "PostgreSQL", version: "17" } : {}),
      null,
      2,
    ),
  );
  const dbConfiguration = (() => {
    if (kind !== "db_model") return null;
    try {
      return asObject(JSON.parse(settings));
    } catch {
      return null;
    }
  })();
  const setModelSetting = (key: string, value: unknown) =>
    setSettings(JSON.stringify({ ...dbConfiguration, [key]: value }, null, 2));
  const save = useMutation({
    mutationFn: () => {
      const value: unknown = kind === "group" ? {} : JSON.parse(settings);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("設定はJSONオブジェクトで指定してください。");
      const data: CollectionInput = {
        name,
        kind,
        parent_id: parent || null,
        version: existing?.version ?? 0,
        configuration: value as CollectionInputConfiguration,
      };
      return existing
        ? updateDesignCollection(projectId, existing.id, data)
        : createDesignCollection(projectId, data);
    },
    onSuccess: onSaved,
  });
  return (
    <div className="space-y-2 rounded-md border p-3">
      <form
        id={form}
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <label className="text-sm font-medium" htmlFor={field}>
          {kind === "group"
            ? "グループ名"
            : kind === "api_set"
              ? "仕様セット名"
              : "DBモデル名"}
        </label>
        <Input
          id={field}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          required
        />
        {kind === "group" && (
          <label className="flex items-center gap-2 text-sm">
            親グループ
            <select
              className={selectClass}
              value={parent}
              onChange={(event) => setParent(event.target.value)}
            >
              <option value="">なし</option>
              {orderedGroups(groups)
                .filter(({ item }) => item.id !== existing?.id)
                .map(({ item, depth }) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >{`${"　".repeat(depth)}${item.name}`}</option>
                ))}
            </select>
          </label>
        )}
      </form>
      {kind === "api_set" && (
        <ApiSetSettings
          projectId={projectId}
          collectionId={existing?.id}
          name={name}
          value={settings}
          onChange={setSettings}
        />
      )}
      {kind === "db_model" && (
        <>
          {dbConfiguration && (
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["product", "対象DB製品"],
                  ["version", "対象バージョン"],
                  ["description", "説明"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1 text-xs">
                  {label}
                  <Input
                    value={asString(dbConfiguration[key])}
                    maxLength={key === "description" ? 3000 : 100}
                    onChange={(event) =>
                      setModelSetting(key, event.target.value)
                    }
                  />
                </label>
              ))}
              <label className="flex flex-col gap-1 text-xs">
                スキーマ（カンマ区切り）
                <Input
                  key={JSON.stringify(dbConfiguration.schemas)}
                  defaultValue={
                    Array.isArray(dbConfiguration.schemas)
                      ? dbConfiguration.schemas.join(", ")
                      : ""
                  }
                  maxLength={3000}
                  onBlur={(event) =>
                    setModelSetting("schemas", [
                      ...new Set(
                        event.target.value
                          .split(",")
                          .map((name) => name.trim())
                          .filter(Boolean),
                      ),
                    ])
                  }
                />
              </label>
            </div>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer">DBモデルの詳細設定</summary>
            <Textarea
              aria-label="セット・モデルの設定"
              className="mt-1 font-mono"
              rows={5}
              value={settings}
              onChange={(event) => setSettings(event.target.value)}
            />
          </details>
        </>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={save.isPending || !name.trim()}
          type="submit"
          form={form}
        >
          保存
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
          取消
        </Button>
      </div>
      <FormApiError error={save.error} />
    </div>
  );
}

function QuickTitle({
  projectId,
  node,
  onSave,
}: {
  projectId: number;
  node: DesignNode;
  onSave: () => Promise<void>;
}) {
  const [value, setValue] = useState(node.title);
  const save = useMutation({
    mutationFn: async () => {
      const row = await readSpecification(projectId, node.id);
      return updateSpecification(projectId, node.id, {
        title: value.trim(),
        summary: row.summary,
        content: row.content,
        version: node.version,
      });
    },
    onSuccess: onSave,
  });
  return (
    <form
      className="py-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim() && value.trim() !== node.title) save.mutate();
      }}
    >
      <Input
        className="h-7"
        value={value}
        aria-label={`${node.title}の名前`}
        maxLength={200}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing && event.key === "Enter")
            event.preventDefault();
        }}
        onBlur={() => {
          if (
            value.trim() &&
            value.trim() !== node.title &&
            !save.isPending &&
            !save.error
          )
            save.mutate();
        }}
      />
      <FormApiError error={save.error} />
    </form>
  );
}

function NodeInspector({
  projectId,
  node,
  groups,
  nodes,
  logical,
  canEdit,
  onSave,
  onPlacement,
  onReference,
  onNewTarget,
  edge,
  newConnection,
  onConnectionSaving,
}: {
  projectId: number;
  node: DesignNode;
  groups: CollectionRead[];
  nodes: DesignNode[];
  logical: boolean;
  canEdit: boolean;
  onSave: () => Promise<void>;
  onPlacement?: () => void;
  onReference?: () => void;
  onNewTarget?: () => void;
  edge?: DesignEdge;
  newConnection?: { targetId?: number };
  onConnectionSaving: (saving: boolean) => void;
}) {
  const [groupChoice, setGroupChoice] = useState(node.group_ids ?? []);
  const [target, setTarget] = useState(
    (edge?.target_id ?? newConnection?.targetId)?.toString() ?? "",
  );
  const [condition, setCondition] = useState(edge?.condition ?? "");
  const [name, setName] = useState(edge?.name ?? "");
  const nameInput = useRef<HTMLInputElement>(null);
  const targetInput = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (newConnection)
      (newConnection.targetId === undefined
        ? targetInput.current
        : nameInput.current
      )?.focus();
  }, [newConnection]);
  const [mode, setMode] = useState<
    "page" | "modal" | "drawer" | "new_tab" | "other" | undefined
  >();
  const [parameters, setParameters] = useState<string>();
  const [trigger, setTrigger] = useState<string>();
  const [eventId, setEventId] = useState<string>();
  const [connectionOpen, setConnectionOpen] = useState(
    Boolean(edge || newConnection),
  );
  const [targetSearch, setTargetSearch] = useState("");
  const [physical, setPhysical] = useState<DatabaseConstraint>();
  const [cardinality, setCardinality] =
    useState<DatabaseRelationship["cardinality"]>();
  const [optional, setOptional] = useState<boolean>();
  const [logicalDescription, setLogicalDescription] = useState<string>();
  const search = useDeferredValue(targetSearch.trim());
  const screen = useQuery({
    queryKey: specificationKeys.detail(projectId, node.id),
    queryFn: () => readSpecification(projectId, node.id),
    enabled:
      canEdit &&
      (node.kind === "database" || (node.kind === "screen" && connectionOpen)),
  });
  const screenContent =
    screen.data?.content.type === "screen" ? screen.data.content : undefined;
  const transition = screenContent?.transitions?.find(
    (item) => item.id === edge?.id,
  );
  const db =
    screen.data?.content.type === "database" ? screen.data.content : undefined;
  const dbLogical =
    node.kind === "database" && (edge ? edge.kind === "logical" : logical);
  const existingForeignKey = db?.constraints?.find(
    (item) => item.id === edge?.id,
  );
  const existingRelation = db?.relationships?.find(
    (item) => item.id === edge?.id,
  );
  const linked = useQuery({
    queryKey: [...specificationKeys.detail(projectId, node.id), "links"],
    queryFn: () => listLinks(projectId, node.id),
    enabled: node.kind === "screen",
  });
  const dependencies =
    linked.data?.filter(
      (item) =>
        item.target_type === "requirement" ||
        item.target_type === "specification",
    ) ?? [];
  const foreignKey: DatabaseConstraint = {
    ...existingForeignKey,
    ...physical,
    kind: "foreign_key",
    target_id: Number(target) || null,
    target_column_ids:
      physical?.target_column_ids ??
      (existingForeignKey?.target_id === Number(target)
        ? existingForeignKey?.target_column_ids
        : []),
  };
  const relay = useQuery({
    queryKey: [
      ...designKey(projectId),
      "connection-targets",
      node.kind,
      search,
    ],
    queryFn: () =>
      readDesignDiagram(projectId, {
        kind: node.kind,
        q: search,
        page_size: 20,
      }),
    enabled: canEdit && connectionOpen && Boolean(search),
    retry: false,
  });
  const targets = new Map(
    [...nodes, ...(relay.data?.nodes ?? [])]
      .filter(
        (item) =>
          item.kind === node.kind &&
          (node.kind !== "database" ||
            dbLogical ||
            (item.collection_id ?? null) === (node.collection_id ?? null)),
      )
      .map((item) => [item.id, item]),
  );
  const memberships = useMutation({
    mutationFn: () =>
      updateMemberships(projectId, node.id, {
        version: node.version,
        group_ids: groupChoice,
      }),
    onSuccess: onSave,
  });
  const save = useMutation({
    onMutate: () => onConnectionSaving(true),
    mutationFn: async (remove: boolean) => {
      const row = await readSpecification(projectId, node.id);
      if (!target) throw new Error("接続先を選択してください。");
      const content = row.content;
      if (content.type === "screen") {
        const existing = (content.transitions ?? []).find(
          (item) => item.id === edge?.id,
        );
        const transitions = (content.transitions ?? []).filter(
          (item) => item.id !== edge?.id,
        );
        if (!remove)
          transitions.push({
            ...existing,
            id: existing?.id ?? crypto.randomUUID(),
            name,
            condition,
            target_id: Number(target),
            mode: mode ?? existing?.mode ?? "page",
            parameters: parameters ?? existing?.parameters ?? "",
            trigger: trigger ?? existing?.trigger ?? "",
            event_id:
              eventId === undefined ? existing?.event_id : eventId || null,
          });
        return updateSpecification(projectId, node.id, {
          title: row.title,
          summary: row.summary,
          version: node.version,
          content: { ...content, transitions },
        });
      }
      if (content.type === "database") {
        if (dbLogical) {
          const existing = (content.relationships ?? []).find(
            (item) => item.id === edge?.id,
          );
          const relationships = (content.relationships ?? []).filter(
            (item) => item.id !== edge?.id,
          );
          if (!remove)
            relationships.push({
              ...existing,
              id: existing?.id ?? crypto.randomUUID(),
              name,
              target_id: Number(target),
              optional: optional ?? existing?.optional ?? false,
              description: logicalDescription ?? existing?.description ?? "",
              cardinality:
                cardinality === undefined
                  ? (existing?.cardinality ?? null)
                  : cardinality,
              constraint_id:
                existing?.target_id === Number(target)
                  ? existing?.constraint_id
                  : null,
            });
          return updateSpecification(projectId, node.id, {
            title: row.title,
            summary: row.summary,
            version: node.version,
            content: { ...content, relationships },
          });
        }
        const existing = (content.constraints ?? []).find(
          (item) => item.id === edge?.id,
        );
        const constraints = (content.constraints ?? []).filter(
          (item) => item.id !== edge?.id,
        );
        if (!remove)
          constraints.push({
            ...existing,
            ...foreignKey,
            id: existing?.id ?? crypto.randomUUID(),
            kind: "foreign_key",
            name,
            target_id: Number(target),
          });
        return updateSpecification(projectId, node.id, {
          title: row.title,
          summary: row.summary,
          version: node.version,
          content: {
            ...content,
            constraints,
            relationships:
              existing && (remove || existing.target_id !== Number(target))
                ? content.relationships?.map((relationship) =>
                    relationship.constraint_id === existing.id
                      ? { ...relationship, constraint_id: null }
                      : relationship,
                  )
                : content.relationships,
          },
        });
      }
      throw new Error("接続を作成できる設計を選択してください。");
    },
    onSuccess: onSave,
    onSettled: () => onConnectionSaving(false),
  });
  return (
    <div className="space-y-3">
      <div>
        <p className="font-mono text-xs text-muted-foreground">
          {specificationCode(node)} · {statusLabels[node.status]}
        </p>
        <p className="font-semibold">{node.title}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {node.identifier || "識別子未設定"}
        </p>
        {node.kind === "screen" && node.subtype && (
          <p className="text-xs">
            {screenKinds[node.subtype as keyof typeof screenKinds]}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        <Button asChild size="sm" variant="outline">
          <Link href={specificationHref(projectId, node.id)}>
            個別設計を開く
          </Link>
        </Button>
        {canEdit && node.kind !== "api" && (
          <Button asChild size="sm" variant="ghost">
            <Link
              href={{
                pathname: specificationHref(projectId, node.id),
                query: {
                  tab: "review",
                  review: edge
                    ? `content/${edge.kind === "logical" ? "relationships" : edge.kind === "foreign_key" ? "constraints" : "transitions"}/${edge.id}/name`
                    : "title",
                },
              }}
            >
              {edge
                ? node.kind === "screen"
                  ? "遷移線に指摘"
                  : "関連線に指摘"
                : node.kind === "screen"
                  ? "画面に指摘"
                  : "テーブルに指摘"}
            </Link>
          </Button>
        )}
      </div>
      {canEdit && db && Boolean(db.columns?.length) && (
        <details className="space-y-1 rounded-md border p-2 text-xs">
          <summary className="cursor-pointer">カラムに指摘</summary>
          <ul className="max-h-48 space-y-1 overflow-auto">
            {db.columns?.map(
              (column) =>
                column.id && (
                  <li key={column.id}>
                    <Link
                      className="block rounded p-1 text-primary hover:bg-muted"
                      href={{
                        pathname: specificationHref(projectId, node.id),
                        query: {
                          tab: "review",
                          review: `content/columns/${column.id}/name`,
                        },
                      }}
                    >
                      {column.name ||
                        column.physical_name ||
                        "名称未設定のカラム"}
                    </Link>
                  </li>
                ),
            )}
          </ul>
        </details>
      )}
      {node.summary && <p className="line-clamp-3 text-sm">{node.summary}</p>}
      {node.kind === "screen" && dependencies.length > 0 && (
        <section className="space-y-1 text-xs">
          <h3 className="font-medium">関連要件・設計</h3>
          <ul className="max-h-40 space-y-1 overflow-auto">
            {dependencies.map((item) => (
              <li key={item.id}>
                <Link
                  className="text-primary hover:underline"
                  href={relatedHref(projectId, item)}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {onReference && (
        <Button variant="ghost" size="sm" onClick={onReference}>
          {node.group_ids?.length ? "所属グループへ移動" : "接続先の設計を表示"}
        </Button>
      )}
      {canEdit && groups.length > 0 && !edge && (
        <details className="rounded-md border p-2 text-sm">
          <summary className="cursor-pointer">機能グループ</summary>
          <fieldset className="space-y-1 pt-2">
            {orderedGroups(groups).map(({ item, depth }) => (
              <label
                key={item.id}
                className="flex items-center gap-2"
                style={{ paddingInlineStart: depth * 10 }}
              >
                <input
                  type="checkbox"
                  checked={groupChoice.includes(item.id)}
                  className="accent-primary"
                  onChange={(event) =>
                    setGroupChoice((value) =>
                      event.target.checked
                        ? [...value, item.id]
                        : value.filter((groupId) => groupId !== item.id),
                    )
                  }
                />
                {item.name}
              </label>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={memberships.isPending}
              onClick={() => memberships.mutate()}
            >
              所属を保存
            </Button>
          </fieldset>
          <FormApiError error={memberships.error} />
        </details>
      )}
      {canEdit && node.kind !== "api" && (
        <details
          open={edge || newConnection ? true : undefined}
          onToggle={(event) => setConnectionOpen(event.currentTarget.open)}
          className="space-y-2 rounded-md border p-2 text-sm"
        >
          <summary className="cursor-pointer">
            {edge
              ? "接続を編集"
              : node.kind === "screen"
                ? "遷移先を接続"
                : dbLogical
                  ? "論理リレーションを追加"
                  : "外部キーを追加"}
          </summary>
          <Input
            ref={nameInput}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="接続名"
            placeholder="接続名"
            maxLength={200}
          />
          <Input
            aria-label="接続先を名前で検索"
            placeholder="接続先を名前で検索"
            value={targetSearch}
            onChange={(event) => setTargetSearch(event.target.value)}
            maxLength={200}
          />
          <select
            ref={targetInput}
            className={cn(selectClass, "w-full")}
            aria-label="既存の接続先"
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              if (node.kind === "database")
                setPhysical({ ...foreignKey, target_column_ids: [] });
            }}
          >
            <option value="">接続先を選択</option>
            {target && !targets.has(Number(target)) && (
              <option value={target}>設計 {target}</option>
            )}
            {[...targets.values()].map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          {db && !dbLogical && (
            <ConstraintDetails
              projectId={projectId}
              id={node.id}
              value={foreignKey}
              options={[]}
              columns={db.columns ?? []}
              readOnly={false}
              hideTarget
              onChange={setPhysical}
            />
          )}
          {dbLogical && (
            <>
              <select
                className={cn(selectClass, "w-full")}
                aria-label="多重度"
                value={
                  (cardinality === undefined
                    ? existingRelation?.cardinality
                    : cardinality) ?? ""
                }
                onChange={(event) =>
                  setCardinality(
                    (event.target.value ||
                      null) as DatabaseRelationship["cardinality"],
                  )
                }
              >
                <option value="">未設定</option>
                <option value="one_to_one">1 対 1</option>
                <option value="one_to_many">1 対 多</option>
                <option value="many_to_many">多 対 多</option>
              </select>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={optional ?? existingRelation?.optional ?? false}
                  onChange={(event) => setOptional(event.target.checked)}
                />
                関連先は任意
              </label>
              <Input
                aria-label="論理仕様"
                placeholder="論理仕様"
                maxLength={5000}
                value={
                  logicalDescription ?? existingRelation?.description ?? ""
                }
                onChange={(event) => setLogicalDescription(event.target.value)}
              />
            </>
          )}
          {node.kind === "screen" && (
            <Input
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              aria-label="遷移条件"
              placeholder="遷移条件"
              maxLength={3000}
            />
          )}
          {node.kind === "screen" && (
            <>
              <select
                aria-label="発火イベント"
                className={cn(selectClass, "w-full")}
                value={eventId ?? transition?.event_id ?? ""}
                onChange={(event) => setEventId(event.target.value)}
              >
                <option value="">イベント未指定</option>
                {screenContent?.actions?.map(
                  (event) =>
                    event.id && (
                      <option key={event.id} value={event.id}>
                        {event.name || "名称未設定"}
                      </option>
                    ),
                )}
              </select>
              <Input
                aria-label="発火条件"
                placeholder="発火条件"
                value={trigger ?? transition?.trigger ?? ""}
                onChange={(event) => setTrigger(event.target.value)}
                maxLength={200}
              />
              <select
                aria-label="遷移方式"
                className={cn(selectClass, "w-full")}
                value={mode ?? transition?.mode ?? "page"}
                onChange={(event) => setMode(event.target.value as typeof mode)}
              >
                <option value="page">ページ遷移</option>
                <option value="modal">モーダル</option>
                <option value="drawer">ドロワー</option>
                <option value="new_tab">別タブ</option>
                <option value="other">その他</option>
              </select>
              <Input
                value={parameters ?? transition?.parameters ?? ""}
                onChange={(event) => setParameters(event.target.value)}
                aria-label="引き渡しパラメータ"
                placeholder="パラメータ"
                maxLength={3000}
              />
            </>
          )}
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!target || save.isPending}
              onClick={() => save.mutate(false)}
            >
              接続を保存
            </Button>
            {edge && (
              <Button
                variant="ghost"
                size="sm"
                disabled={save.isPending}
                onClick={() => save.mutate(true)}
              >
                接続を削除
              </Button>
            )}
            {onNewTarget && !edge && (
              <Button variant="ghost" size="sm" onClick={onNewTarget}>
                新規画面へ接続
              </Button>
            )}
          </div>
          <FormApiError error={save.error ?? relay.error ?? screen.error} />
        </details>
      )}
      {canEdit && onPlacement && (
        <Button variant="ghost" size="sm" onClick={onPlacement}>
          {node.placement?.hidden ? "図に再配置" : "図から配置解除"}
        </Button>
      )}
    </div>
  );
}
