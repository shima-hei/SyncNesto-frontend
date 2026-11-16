"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { GripVerticalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GanttOrderMove } from "@/lib/api/generated/model/ganttOrderMove";

export const GANTT_ORDER_ROW =
  "relative before:hidden before:pointer-events-none before:absolute before:inset-x-0 before:z-20 before:h-0.5 before:bg-primary data-[gantt-drop=before]:before:top-0 data-[gantt-drop=before]:before:block data-[gantt-drop=after]:before:bottom-0 data-[gantt-drop=after]:before:block";

export type GanttOrderControl = {
  id: number;
  group: string;
  label: string;
  previous?: number;
  next?: number;
  disabled: boolean;
  save: (
    move: GanttOrderMove,
    label: string,
    trigger: HTMLButtonElement | null,
  ) => void;
};

type Target = { row: HTMLElement; placement: GanttOrderMove["placement"] };
type Drag = {
  pointer: number;
  start: number;
  y: number;
  x: number;
  region: HTMLElement;
  rows: HTMLElement[];
  active: boolean;
  frame: number;
  target?: Target;
};

function clearDrag(drag: Drag) {
  cancelAnimationFrame(drag.frame);
  drag.target?.row.removeAttribute("data-gantt-drop");
  delete drag.region.dataset.ganttReordering;
}

export function GanttOrderHandle({
  id,
  group,
  label,
  previous,
  next,
  disabled,
  save,
}: GanttOrderControl) {
  const [open, setOpen] = useState(false);
  const drag = useRef<Drag | null>(null);
  const ignoreClick = useRef(false);

  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(
    () => () => {
      if (drag.current) clearDrag(drag.current);
      drag.current = null;
    },
    [],
  );

  const clear = () => {
    if (drag.current) clearDrag(drag.current);
    drag.current = null;
  };

  const findTarget = (current: Drag) => {
    const bounds = current.region.getBoundingClientRect();
    const firstRow = current.rows[0]?.getBoundingClientRect();
    const lastRow = current.rows.at(-1)?.getBoundingClientRect();
    let target: Target | undefined;
    if (
      firstRow &&
      lastRow &&
      current.x >= bounds.left &&
      current.x <= bounds.right &&
      current.y >= Math.max(bounds.top, firstRow.top - 4) &&
      current.y <= Math.min(bounds.bottom, lastRow.bottom + 4)
    ) {
      const y = current.y;
      for (const row of current.rows) {
        const rect = row.getBoundingClientRect();
        target = {
          row,
          placement: y < rect.top + rect.height / 2 ? "before" : "after",
        };
        if (y < rect.top + rect.height / 2) break;
      }
      const anchor = Number(target?.row.dataset.ganttOrderId);
      if (
        anchor === id ||
        (anchor === previous && target?.placement === "after") ||
        (anchor === next && target?.placement === "before")
      )
        target = undefined;
    }
    if (
      current.target?.row === target?.row &&
      current.target?.placement === target?.placement
    )
      return;
    current.target?.row.removeAttribute("data-gantt-drop");
    if (target) target.row.dataset.ganttDrop = target.placement;
    current.target = target;
  };

  const scroll = () => {
    const current = drag.current;
    if (!current) return;
    const { top, bottom, left, right } = current.region.getBoundingClientRect();
    if (
      current.x >= left &&
      current.x <= right &&
      current.y >= top &&
      current.y <= bottom
    ) {
      const speed =
        Math.max(0, current.y - (bottom - 42)) -
        Math.max(0, top + 70 - current.y);
      const before = current.region.scrollTop;
      current.region.scrollTop +=
        Math.sign(speed) * Math.min(Math.abs(speed) / 4, 14);
      if (before !== current.region.scrollTop) findTarget(current);
    }
    current.frame = requestAnimationFrame(scroll);
  };

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      disabled ||
      open ||
      drag.current ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    const region = event.currentTarget.closest<HTMLElement>(
      "[data-gantt-scroll]",
    );
    if (!region) return;
    ignoreClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointer: event.pointerId,
      start: event.clientY,
      y: event.clientY,
      x: event.clientX,
      region,
      rows: Array.from(
        region.querySelectorAll<HTMLElement>(
          `[data-gantt-order-group="${CSS.escape(group)}"]`,
        ),
      ),
      active: false,
      frame: 0,
    };
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    current.y = event.clientY;
    current.x = event.clientX;
    if (!current.active) {
      if (Math.abs(current.start - current.y) < 5) return;
      current.active = true;
      ignoreClick.current = true;
      current.region.dataset.ganttReordering = "";
      current.frame = requestAnimationFrame(scroll);
    }
    findTarget(current);
  };

  const commit = (anchor: number, placement: GanttOrderMove["placement"]) => {
    setOpen(false);
    if (!disabled)
      save(
        { item_id: id, anchor_id: anchor, placement },
        label,
        trigger.current,
      );
  };

  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (current.active) move(event);
    const target = current.target;
    clear();
    if (target)
      commit(Number(target.row.dataset.ganttOrderId), target.placement);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={trigger}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`「${label}」を並べ替え`}
          title="並べ替え"
          aria-disabled={disabled}
          className="size-7 shrink-0 touch-none select-none text-muted-foreground enabled:cursor-grab active:cursor-grabbing"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={clear}
          onLostPointerCapture={clear}
          onClickCapture={(event) => {
            if ((event.detail > 0 && ignoreClick.current) || disabled) {
              ignoreClick.current = false;
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && drag.current) {
              event.preventDefault();
              clear();
            }
          }}
        >
          <GripVerticalIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-1"
        align="start"
        aria-label="並べ替え"
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={!previous || disabled}
          onClick={() => previous && commit(previous, "before")}
        >
          上へ移動
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!next || disabled}
          onClick={() => next && commit(next, "after")}
        >
          下へ移動
        </Button>
      </PopoverContent>
    </Popover>
  );
}
