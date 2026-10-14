import type {
  ApiSpecification,
  ScreenSpecification,
  SpecificationRead,
  SpecificationLinkRead,
  SpecificationCreate,
  SpecificationListItem,
} from "@/lib/api/generated/model";

export type Kind = "api" | "screen";
export type Content =
  | (ApiSpecification & { type: "api" })
  | (ScreenSpecification & { type: "screen" });
export type Values = { title: string; summary: string; content: Content };
export const specificationKeys = {
  all: (projectId: number) => ["specifications", projectId] as const,
  detail: (projectId: number, id: number) =>
    ["specifications", projectId, id] as const,
};
export const specificationHref = (projectId: number, id?: number) =>
  `/projects/joined/${projectId}/specifications${id ? `/${id}` : ""}`;
export const kindLabels = { api: "API設計書", screen: "画面設計書" } as const;
export const statusLabels = {
  draft: "下書き",
  in_review: "レビュー待ち",
  changes_requested: "修正依頼あり",
  approved: "承認済み",
} as const;
export const targetLabels = {
  requirement: "要件",
  task: "タスク",
  test_item: "テスト項目",
  specification: "画面・API設計書",
  document: "参考ドキュメント",
} as const;

export function initialValues(kind: Kind, row?: SpecificationRead): Values {
  if (row)
    return {
      title: row.title,
      summary: row.summary ?? "",
      content:
        row.kind === "api"
          ? { ...(row.content as ApiSpecification), type: "api" }
          : { ...(row.content as ScreenSpecification), type: "screen" },
    };
  return {
    title: "",
    summary: "",
    content:
      kind === "api"
        ? {
            type: "api",
            method: "GET",
            path: "",
            request_fields: [],
            response_fields: [],
            responses: [],
          }
        : { type: "screen", route: "", fields: [], actions: [], states: [] },
  };
}

export function toCreate(values: Values): SpecificationCreate {
  return { ...values, title: values.title.trim() };
}

export function relatedHref(projectId: number, target: SpecificationLinkRead) {
  const base = `/projects/joined/${projectId}`;
  const id = encodeURIComponent(target.target_id);
  switch (target.target_type) {
    case "requirement":
      return `${base}/requirements/${target.container_id}/items/${id}`;
    case "task":
      return `${base}/tasks/${id}`;
    case "test_item":
      return `${base}/test-designs/${target.container_id}?item=${id}`;
    case "specification":
      return specificationHref(projectId, Number(id));
    case "document":
      return `${base}/documents/${id}`;
  }
}

export const specificationCode = (
  row: Pick<SpecificationListItem, "kind" | "id">,
) => `${row.kind === "api" ? "API" : "SCR"}-${String(row.id).padStart(4, "0")}`;
export const reviewElementId = (path: string) =>
  `specification-field-${encodeURIComponent(path)}`;

export function reviewPathLabel(values: Values, path: string): string {
  const labels: Record<string, string> = {
    title: "設計書名",
    summary: "目的",
    path: "APIパス",
    method: "HTTPメソッド",
    authentication: "認証方法",
    authorization: "操作権限",
    route: "画面URL",
    audience: "利用者・権限",
    reference_url: "参考URL",
    notes: "補足",
    request_fields: "リクエスト項目",
    response_fields: "レスポンス項目",
    fields: "画面項目",
    actions: "操作・遷移",
    states: "状態ごとの表示",
    responses: "成功・エラー時の応答",
    name: "項目名",
    data_type: "データ型",
    required: "必須条件",
    location: "項目の役割",
    description: "内容・条件",
    validation: "入力規則",
    example: "記入例",
    destination: "遷移先・応答例",
  };
  const parts = path.split("/");
  if (parts.length <= 2) return labels[parts.at(-1) ?? ""] ?? "設計内容";
  const content = values.content as unknown as Record<string, unknown>;
  const rows = content[parts[1]];
  const item = Array.isArray(rows)
    ? rows.find((row: { id?: string }) => row.id === parts[2])
    : undefined;
  return `${labels[parts[1]] ?? "設計内容"} / ${item?.name || "名称未設定・削除済みの項目"}${parts[3] ? ` / ${labels[parts[3]] ?? "内容"}` : ""}`;
}
