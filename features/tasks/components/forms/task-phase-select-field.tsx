"use client";

import { useState } from "react";
import { useListPhasesProjectsProjectIdPhasesGet } from "@/lib/api/generated/tasks/tasks";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Button } from "@/components/ui/button";
import { getTaskPhaseOptions } from "../../lib/task-phase-options";
import { TaskSelectField } from "./task-form-fields";

export const EFFORT_BASIS_OPTIONS = [
  { value: "own", label: "自身の作業" },
  { value: "rollup", label: "子の集計枠" },
  { value: "unreviewed", label: "未確認" },
] as const;

export function TaskPhaseSelectField({
  projectId,
  value,
  retainedValue,
  error,
  onChange,
}: {
  projectId: number;
  value: string;
  retainedValue?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [page, setPage] = useState(1);
  const query = useListPhasesProjectsProjectIdPhasesGet(
    projectId,
    { page, page_size: 100, include_archived: true },
    { query: { retry: false } },
  );
  const options = getTaskPhaseOptions(
    query.data?.items ?? [],
    value,
    retainedValue,
  );
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
