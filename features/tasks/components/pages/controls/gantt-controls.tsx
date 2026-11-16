"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  SearchIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GanttResponse, MilestoneRead } from "@/lib/api/generated/model";

import { GANTT_DISPLAY_OPTIONS } from "../../../constants/task-view-options";
import { exportGanttCsv, exportGanttPdf } from "../../../lib/gantt-export";
import {
  getCurrentGanttRange,
  getTodayGanttRange,
  moveGanttRange,
} from "../../../lib/gantt-range-controls";

export function GanttControls({
  canUpdate,
  startDate,
  endDate,
  displayUnit,
  search,
  gantt,
  milestones,
  filterFields,
  actions,
  onRangeChange,
  onDisplayUnitChange,
  onSearchChange,
  onOpenMilestoneList,
  onOpenMilestoneCreate,
}: {
  canUpdate: boolean;
  startDate: string;
  endDate: string;
  displayUnit: string;
  search: string;
  gantt: GanttResponse | null;
  milestones: MilestoneRead[];
  filterFields: ReactNode;
  actions: ReactNode;
  onRangeChange: (range: { startDate: string; endDate: string }) => void;
  onDisplayUnitChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onOpenMilestoneList: () => void;
  onOpenMilestoneCreate: () => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const move = (direction: -1 | 1) => {
    const range = getCurrentGanttRange(startDate, endDate, displayUnit);
    onRangeChange(moveGanttRange(range, displayUnit, direction));
  };

  return (
    <section aria-label="ガントの表示設定" className="min-w-0">
      <div className="rounded-lg border bg-card px-2 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-0.5"
            role="group"
            aria-label="表示期間"
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="前の期間"
              onClick={() => move(-1)}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRangeChange(getTodayGanttRange(displayUnit))}
            >
              今日
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="次の期間"
              onClick={() => move(1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
          <select
            aria-label="表示単位"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={displayUnit}
            onChange={(event) => onDisplayUnitChange(event.target.value)}
          >
            {GANTT_DISPLAY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="relative min-w-40 flex-1">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="タスクを検索"
              placeholder="タスク名・ID・担当者"
              className="h-8 pl-8"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-expanded={filterOpen}
            aria-controls="gantt-filter-fields"
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <ListFilterIcon data-icon="inline-start" /> フィルター
          </Button>
          {actions}
        </div>
        <div
          id="gantt-filter-fields"
          hidden={!filterOpen}
          className="mt-2 space-y-3 border-t pt-2"
        >
          {filterFields}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="gantt-start-date">表示開始日</Label>
              <Input
                id="gantt-start-date"
                type="date"
                value={startDate}
                onChange={(event) =>
                  onRangeChange({ startDate: event.target.value, endDate })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gantt-end-date">表示終了日</Label>
              <Input
                id="gantt-end-date"
                type="date"
                value={endDate}
                onChange={(event) =>
                  onRangeChange({ startDate, endDate: event.target.value })
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRangeChange({ startDate: "", endDate: "" })}
            >
              期間をクリア
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!milestones.length}
              onClick={onOpenMilestoneList}
            >
              マイルストーン一覧
            </Button>
            {canUpdate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onOpenMilestoneCreate}
              >
                マイルストーン追加
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!gantt}
              onClick={() => gantt && exportGanttCsv(gantt)}
            >
              CSV出力
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!gantt}
              onClick={() => gantt && exportGanttPdf(gantt, displayUnit)}
            >
              PDF出力
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
