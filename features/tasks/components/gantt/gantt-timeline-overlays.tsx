import type { MilestoneRead } from "@/lib/api/generated/model";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { getMilestoneStatusLabel } from "../../constants/task-options";
import {
  type DateRange,
  getDateColumnStyle,
  getMilestoneLeft,
  getTodayLeft,
  getWeekendBands,
} from "../../lib/gantt-timeline";

export function GanttMilestoneMarker({
  milestone,
  range,
  showLabel,
  canUpdate,
  onSelect,
}: {
  milestone: MilestoneRead;
  range: DateRange;
  showLabel: boolean;
  canUpdate: boolean;
  onSelect: (milestone: MilestoneRead) => void;
}) {
  const left = getMilestoneLeft(milestone, range);
  const title = getMilestoneTitle(milestone);

  return (
    <button
      type="button"
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left }}
      title={title}
      aria-label={title}
      disabled={!canUpdate}
      onClick={() => onSelect(milestone)}
    >
      <span
        className={cn(
          "size-3 rotate-45 rounded-[2px]",
          getMilestoneMarkerClassName(milestone.status)
        )}
      />
      {showLabel ? (
        <span className="max-w-28 truncate text-xs text-muted-foreground">
          {milestone.title}
        </span>
      ) : null}
    </button>
  );
}

export function GanttMilestoneHeaderMarkers({
  milestones,
  range,
  canUpdate,
  onSelect,
}: {
  milestones: MilestoneRead[];
  range: DateRange;
  canUpdate: boolean;
  onSelect: (milestone: MilestoneRead) => void;
}) {
  return (
    <>
      <GanttMilestoneLines milestones={milestones} range={range} />
      {milestones.map((milestone) => {
        const title = getMilestoneTitle(milestone);

        return (
          <button
            key={milestone.id}
            type="button"
            className="absolute top-1 -translate-x-1/2"
            style={{ left: getMilestoneLeft(milestone, range) }}
            title={title}
            aria-label={title}
            disabled={!canUpdate}
            onClick={() => onSelect(milestone)}
          >
            <span
              className={cn(
                "block size-2.5 rotate-45 rounded-[2px]",
                getMilestoneMarkerClassName(milestone.status)
              )}
            />
          </button>
        );
      })}
    </>
  );
}

export function GanttMilestoneLines({
  milestones,
  range,
}: {
  milestones: MilestoneRead[];
  range: DateRange;
}) {
  return (
    <>
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className={cn(
            "pointer-events-none absolute top-0 bottom-0 w-px opacity-35",
            getMilestoneLineClassName(milestone.status)
          )}
          style={{ left: getMilestoneLeft(milestone, range) }}
          title={getMilestoneTitle(milestone)}
        />
      ))}
    </>
  );
}

export function TodayLine({ range }: { range: DateRange }) {
  const todayLeft = getTodayLeft(range);

  if (!todayLeft) {
    return null;
  }

  return (
    <div
      className="absolute top-2 bottom-2 w-px bg-destructive"
      style={{ left: todayLeft }}
      title="今日"
    />
  );
}

export function DropDateHighlight({
  date,
  range,
}: {
  date?: string | null;
  range: DateRange;
}) {
  if (!date) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 border-x border-primary/30 bg-primary/10"
      style={getDateColumnStyle(date, range)}
      title={`追加日: ${formatDate(date)}`}
    />
  );
}

export function WeekendBands({ range }: { range: DateRange }) {
  const bands = getWeekendBands(range);

  return (
    <>
      {bands.map((band) => (
        <div
          key={band.key}
          className="absolute top-0 bottom-0 bg-muted/40"
          style={{ left: band.left, width: band.width }}
          title="休日"
        />
      ))}
    </>
  );
}

const getMilestoneTitle = (milestone: MilestoneRead) => {
  return `${milestone.title} / ${formatDate(milestone.target_date)} / ${getMilestoneStatusLabel(milestone.status)}`;
};

const getMilestoneMarkerClassName = (status?: string | null) => {
  return cn(
    "bg-[var(--status-warning-fg)]",
    status === "achieved" && "bg-[var(--status-success-fg)]",
    status === "missed" && "bg-[var(--status-danger-fg)]",
    status === "cancelled" && "bg-[var(--status-neutral-fg)]"
  );
};

const getMilestoneLineClassName = (status?: string | null) => {
  return cn(
    "bg-[var(--status-warning-border)]",
    status === "achieved" && "bg-[var(--status-success-border)]",
    status === "missed" && "bg-[var(--status-danger-border)]",
    status === "cancelled" && "bg-[var(--status-neutral-border)]"
  );
};
