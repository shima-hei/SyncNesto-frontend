"use client";

import Link from "next/link";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/error";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { documentsHref } from "../../lib/document";

export function DocumentLoadError({
  error,
  projectId,
  retry,
}: {
  error: Error;
  projectId: number;
  retry: () => void;
}) {
  if (error instanceof ApiError && [403, 404].includes(error.status)) {
    return (
      <div className="flex flex-col gap-3" role="alert">
        <p>{getApiErrorMessage(error)}</p>
        <Button asChild variant="outline" className="w-fit">
          <Link href={documentsHref(projectId)}>一覧へ戻る</Link>
        </Button>
      </div>
    );
  }
  return <DataLoadError resourceName="ドキュメント" onRetry={retry} />;
}
