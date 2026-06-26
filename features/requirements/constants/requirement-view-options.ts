export const ALL_REQUIREMENT_STATUSES = "all";
export const ALL_REQUIREMENT_TYPES = "all";
export const ALL_REQUIREMENT_PRIORITIES = "all";

export const REQUIREMENT_SORT_OPTIONS = [
  { value: "updated_desc", label: "更新日時 新しい順" },
  { value: "updated_asc", label: "更新日時 古い順" },
  { value: "code_asc", label: "要件コード 昇順" },
  { value: "code_desc", label: "要件コード 降順" },
  { value: "title_asc", label: "タイトル 昇順" },
  { value: "title_desc", label: "タイトル 降順" },
] as const;
