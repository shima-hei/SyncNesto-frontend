import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="@container/page-header min-w-0">
      <div className="flex min-w-0 flex-col gap-3 @min-[40rem]/page-header:flex-row @min-[40rem]/page-header:items-start @min-[40rem]/page-header:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance break-words">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground break-words">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
