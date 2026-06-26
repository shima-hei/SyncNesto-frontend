import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  message?: string;
  className?: string;
};

export function LoadingState({ message, className }: LoadingStateProps) {
  if (message) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {message}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
