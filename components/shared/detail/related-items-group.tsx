import type { ReactNode } from "react";

export function RelatedItemsGroup({
  title,
  count,
  summary,
  action,
  children,
}: {
  title: string;
  count?: number;
  summary?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-label={title} className="min-w-0 border-t py-3">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-semibold">
          {title}
          {count === undefined ? null : (
            <span className="text-xs font-normal text-muted-foreground">
              {count}件
            </span>
          )}
          {summary ? (
            <span className="text-xs font-normal text-muted-foreground">
              {summary}
            </span>
          ) : null}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}
