import type { ReactNode } from "react";
import { UserDisplay } from "@/components/shared/display/user-avatar";

export function ActivityTimelineItem({
  occurredAt,
  timeLabel,
  actorLabel,
  actorAvatarUrl,
  actionLabel,
  description,
  detailLabel,
  children,
}: {
  occurredAt?: string;
  timeLabel: string;
  actorLabel: string;
  actorAvatarUrl?: string | null;
  actionLabel: string;
  description?: ReactNode;
  detailLabel?: string;
  children?: ReactNode;
}) {
  return (
    <li className="relative min-w-0 border-s py-2 ps-4 before:absolute before:start-[-0.2rem] before:top-4 before:size-1.5 before:rounded-full before:bg-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm [overflow-wrap:anywhere]">
        <span className="text-xs">
          <UserDisplay name={actorLabel} src={actorAvatarUrl} />
        </span>
        <time
          className="text-xs tabular-nums text-muted-foreground"
          dateTime={occurredAt}
        >
          {timeLabel}
        </time>
        <span className="font-medium">{actionLabel}</span>
        {description}
      </div>
      {children && detailLabel ? (
        <details className="mt-1 text-xs">
          <summary className="w-fit cursor-pointer py-1 text-muted-foreground">
            {detailLabel}
          </summary>
          <div className="mt-2 space-y-2">{children}</div>
        </details>
      ) : null}
    </li>
  );
}
