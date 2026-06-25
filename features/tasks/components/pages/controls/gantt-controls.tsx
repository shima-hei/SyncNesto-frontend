"use client";

import { useState } from "react";
import { ListIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GanttResponse, MilestoneRead } from "@/lib/api/generated/model";

import {
  ALL_GANTT_FILTERS,
  GANTT_DISPLAY_OPTIONS,
} from "../../../constants/task-view-options";
import { exportGanttCsv, exportGanttPdf } from "../../../lib/gantt-export";
import {
  getCurrentGanttRange,
  getTodayGanttRange,
  moveGanttRange,
} from "../../../lib/gantt-range-controls";
import { TaskRequirementSelectField } from "../../forms/task-requirement-select-field";
import { TaskUserSelectField } from "../../forms/task-user-select-field";

export function GanttControls({
  projectId,
  canUpdate,
  startDate,
  endDate,
  assigneeId,
  requirementId,
  displayUnit,
  gantt,
  milestones,
  onStartDateChange,
  onEndDateChange,
  onAssigneeIdChange,
  onRequirementIdChange,
  onDisplayUnitChange,
  onOpenMilestoneList,
  onOpenMilestoneCreate,
}: {
  projectId: number;
  canUpdate: boolean;
  startDate: string;
  endDate: string;
  assigneeId: string;
  requirementId: string;
  displayUnit: string;
  gantt: GanttResponse | null;
  milestones: MilestoneRead[];
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onAssigneeIdChange: (value: string) => void;
  onRequirementIdChange: (value: string) => void;
  onDisplayUnitChange: (value: string) => void;
  onOpenMilestoneList: () => void;
  onOpenMilestoneCreate: () => void;
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const handleMoveRange = (direction: -1 | 1) => {
    const currentRange = getCurrentGanttRange(startDate, endDate, displayUnit);
    const movedRange = moveGanttRange(currentRange, displayUnit, direction);

    onStartDateChange(movedRange.startDate);
    onEndDateChange(movedRange.endDate);
  };
  const handleMoveToToday = () => {
    const todayRange = getTodayGanttRange(displayUnit);

    onStartDateChange(todayRange.startDate);
    onEndDateChange(todayRange.endDate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ガント表示条件</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(10rem,12rem)_auto] xl:items-end">
          <div className="flex min-w-0 flex-col gap-2">
            <Label>表示単位</Label>
            <Select value={displayUnit} onValueChange={onDisplayUnitChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {GANTT_DISPLAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleMoveRange(-1)}
            >
              前へ
            </Button>
            <Button type="button" variant="outline" onClick={handleMoveToToday}>
              今日
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleMoveRange(1)}
            >
              次へ
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!milestones.length}
              onClick={onOpenMilestoneList}
            >
              <ListIcon data-icon="inline-start" />
              マイルストーン一覧
            </Button>
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                onClick={onOpenMilestoneCreate}
              >
                <PlusIcon data-icon="inline-start" />
                マイルストーン追加
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdvancedOpen((current) => !current)}
            >
              <SlidersHorizontalIcon data-icon="inline-start" />
              詳細条件
            </Button>
          </div>
        </div>
        {isAdvancedOpen ? (
          <div className="grid gap-3 border-t pt-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="gantt-start-date">開始日</Label>
              <Input
                id="gantt-start-date"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="gantt-end-date">終了日</Label>
              <Input
                id="gantt-end-date"
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
              />
            </div>
            <TaskUserSelectField
              projectId={projectId}
              label="担当者"
              value={assigneeId}
              placeholder="すべて"
              onChange={onAssigneeIdChange}
            />
            <TaskRequirementSelectField
              projectId={projectId}
              value={requirementId}
              placeholder="すべて"
              onChange={onRequirementIdChange}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!gantt}
                onClick={() => {
                  if (gantt) {
                    exportGanttCsv(gantt);
                  }
                }}
              >
                CSV出力
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!gantt}
                onClick={() => {
                  if (gantt) {
                    exportGanttPdf(gantt, displayUnit);
                  }
                }}
              >
                PDF出力
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onStartDateChange(ALL_GANTT_FILTERS);
                  onEndDateChange(ALL_GANTT_FILTERS);
                  onAssigneeIdChange(ALL_GANTT_FILTERS);
                  onRequirementIdChange(ALL_GANTT_FILTERS);
                }}
              >
                条件クリア
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
