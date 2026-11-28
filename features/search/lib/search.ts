import type { SearchItem } from "@/lib/api/generated/model/searchItem";
import { smartLinkPath } from "@/lib/smart-links/reference";

export const searchCategories = [
  { value: "requirement", label: "要件" },
  { value: "task", label: "タスク" },
  { value: "test", label: "テスト" },
  { value: "document", label: "ドキュメント" },
] as const;

export type SearchCategory = (typeof searchCategories)[number]["value"];
export type SearchState = {
  q: string;
  category?: SearchCategory;
  projectId?: number;
  page: number;
};

export const searchKindLabels: Record<SearchItem["kind"], string> = {
  requirement_document: "要件定義書",
  requirement: "要件",
  task: "タスク",
  test_design: "テスト設計書",
  test_item: "テスト項目",
  test_case: "テストケース",
  document: "ドキュメント",
  specification: "設計書",
};

export function readSearchState(
  params: Record<string, string | string[] | undefined>,
): SearchState {
  const single = (key: string) =>
    typeof params[key] === "string" ? params[key] : "";
  const positive = (value: string) => {
    const number = Number(value);
    return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(number)
      ? number
      : undefined;
  };
  const category = searchCategories.find(
    (item) => item.value === single("category"),
  )?.value;
  return {
    q: single("q").trim().slice(0, 200),
    category,
    projectId: positive(single("project_id")),
    page: Math.min(positive(single("page")) ?? 1, 500),
  };
}

export function searchHref(state: SearchState): string {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim().slice(0, 200));
  if (state.category) params.set("category", state.category);
  if (state.projectId) params.set("project_id", String(state.projectId));
  if (state.page > 1) params.set("page", String(state.page));
  return `/search${params.size ? `?${params}` : ""}`;
}

export function searchResultHref(item: SearchItem): string {
  return smartLinkPath(item);
}

export function matchingParts(text: string, q: string) {
  if (!q) return [{ text, match: false }];
  const expression = new RegExp(
    q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "giu",
  );
  const parts: { text: string; match: boolean }[] = [];
  let start = 0;
  for (const match of text.matchAll(expression)) {
    if (match.index > start)
      parts.push({ text: text.slice(start, match.index), match: false });
    parts.push({ text: match[0], match: true });
    start = match.index + match[0].length;
  }
  if (start < text.length)
    parts.push({ text: text.slice(start), match: false });
  return parts;
}
