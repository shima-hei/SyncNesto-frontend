import type { ReactNode } from "react";
import {
  CircleCheckIcon,
  CircleIcon,
  Clock3Icon,
  FlagIcon,
  MinusIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"
  | "info"
  | "progress"
  | "warning"
  | "success"
  | "danger"
  | "resolved"
  | "returned";
export type IndicatorTone = StatusTone | "changed";

const toneClasses: Record<IndicatorTone, string> = {
  neutral:
    "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-fg)]",
  info: "border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
  progress:
    "border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  warning:
    "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
  success:
    "border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
  danger:
    "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]",
  resolved:
    "border-[var(--status-resolved-border)] bg-[var(--status-resolved-bg)] text-[var(--status-resolved-fg)]",
  returned:
    "border-[var(--status-returned-border)] bg-[var(--status-returned-bg)] text-[var(--status-returned-fg)]",
  changed:
    "border-[var(--status-changed-border)] bg-[var(--status-changed-bg)] text-[var(--status-changed-fg)]",
};

const statusIcons = {
  neutral: CircleIcon,
  info: Clock3Icon,
  progress: Clock3Icon,
  warning: TriangleAlertIcon,
  success: CircleCheckIcon,
  danger: XCircleIcon,
  resolved: CircleCheckIcon,
  returned: RotateCcwIcon,
  changed: RotateCcwIcon,
};

export function StatusBadge({
  tone,
  children,
  className,
  asChild,
}: {
  tone: IndicatorTone;
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  return (
    <Badge
      asChild={asChild}
      variant="outline"
      className={cn(toneClasses[tone], className)}
    >
      {children}
    </Badge>
  );
}

export function StatusIndicator({
  tone,
  children,
}: {
  tone: IndicatorTone;
  children: ReactNode;
}) {
  const Icon = statusIcons[tone];
  return (
    <StatusBadge tone={tone}>
      <Icon aria-hidden="true" />
      {children}
    </StatusBadge>
  );
}

const priorityClasses = {
  critical: "priority-critical",
  high: "priority-high",
  normal: "priority-normal",
  low: "priority-low",
};

export function PriorityIndicator({
  level,
  children,
}: {
  level: keyof typeof priorityClasses;
  children: ReactNode;
}) {
  const Icon = level === "low" ? MinusIcon : FlagIcon;
  return (
    <Badge variant="outline" className={priorityClasses[level]}>
      <Icon aria-hidden="true" />
      {children}
    </Badge>
  );
}
