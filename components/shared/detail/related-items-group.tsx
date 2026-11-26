import type { ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";

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
  const heading = (
    <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm font-semibold">
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
  );

  return (
    <section aria-label={title} className="relative min-w-0 border-t py-3">
      {count && count > 0 ? (
        <details open className="group/related">
          <summary
            className={`flex min-h-8 cursor-pointer list-none items-center gap-2 rounded-sm marker:content-none hover:text-foreground/80 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden ${action ? "pe-38" : ""}`}
          >
            <ChevronRightIcon
              className="size-4 shrink-0 text-muted-foreground group-open/related:rotate-90"
              aria-hidden
            />
            {heading}
          </summary>
          {children}
        </details>
      ) : (
        <>
          <div className="flex min-h-8 flex-wrap items-center gap-2">
            {heading}
          </div>
          {children}
        </>
      )}
      {action ? <div className="absolute end-0 top-3">{action}</div> : null}
    </section>
  );
}
