import { Skeleton } from "@/components/ui/skeleton";

export function RequirementDocumentDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
