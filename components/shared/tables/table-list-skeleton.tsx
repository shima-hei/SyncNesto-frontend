import { Skeleton } from "@/components/ui/skeleton";

type TableListSkeletonProps = {
  rows?: number;
  avatar?: boolean;
  widths?: readonly string[];
};

export function TableListSkeleton({
  rows = 5,
  avatar = false,
  widths = ["w-40", "w-56", "w-20"],
}: TableListSkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2">
          {avatar ? <Skeleton className="size-8 rounded-full" /> : null}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className={`h-4 ${widths[0] ?? "w-40"}`} />
            {widths[1] ? <Skeleton className={`h-3 ${widths[1]}`} /> : null}
          </div>
          {widths.slice(2).map((width, widthIndex) => (
            <Skeleton key={widthIndex} className={`h-5 ${width}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
