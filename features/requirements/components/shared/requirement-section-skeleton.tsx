import { Skeleton } from "@/components/ui/skeleton";

type RequirementSectionSkeletonProps = {
  rows?: number;
};

export function RequirementSectionSkeleton({
  rows = 2,
}: RequirementSectionSkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}
