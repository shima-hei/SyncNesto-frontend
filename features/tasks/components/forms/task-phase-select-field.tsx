"use client";

import { useState } from "react";
import { useListPhasesProjectsProjectIdPhasesGet } from "@/lib/api/generated/tasks/tasks";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { TaskSelectField } from "./task-form-fields";

export const EFFORT_BASIS_OPTIONS = [
  { value: "own", label: "自身の作業" },
  { value: "rollup", label: "子の集計枠" },
  { value: "unreviewed", label: "未確認" },
] as const;

export function TaskPhaseSelectField({
  projectId,
  value,
  error,
  onChange,
}: {
  projectId: number;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [page, setPage] = useState(1);
  const query = useListPhasesProjectsProjectIdPhasesGet(
    projectId,
    { page, page_size: 100, include_archived: true },
    { query: { retry: false } },
  );
  const options = [
    { value: "unclassified", label: "未分類" },
    { value: "shared", label: "共通作業" },
    ...(query.data?.items ?? []).map((phase) => ({
      value: `phase:${phase.id}`,
      label: `${phase.name}${phase.archived_at ? "（アーカイブ済み）" : ""}`,
      disabled: Boolean(phase.archived_at) && value !== `phase:${phase.id}`,
    })),
  ];
  if (
    value.startsWith("phase:") &&
    !options.some((option) => option.value === value)
  )
    options.push({ value, label: `現在の工程 #${value.slice(6)}（候補外）` });
  return (
    <div className="flex flex-col gap-2">
      <TaskSelectField
        label="工程所属"
        value={value}
        error={error}
        options={options}
        onChange={onChange}
      />
      {query.isError ? (
        <div role="alert" className="text-sm text-destructive">
          工程候補を取得できません。現在の所属は保持しています。
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void query.refetch()}
          >
            再取得
          </Button>
        </div>
      ) : null}
      {query.data && query.data.total > 100 ? (
        <DataPagination
          page={page}
          pageSize={100}
          total={query.data.total}
          currentCount={query.data.items.length}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
