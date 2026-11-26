"use client";

import { useId, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IncludedSourcesPicker } from "@/features/artifact-releases/components/included-sources-picker";
import { ApiError } from "@/lib/api/error";
import {
  createRelease,
  previewRelease,
  readSource,
} from "@/features/artifact-releases/lib/api";
import type {
  ArtifactCreateRequest,
  ArtifactSource,
  PublicationPreviewRequest,
} from "@/lib/api/generated/model";
import { createPublication, previewPublication } from "../lib/api";

export function RequirementPublicationPrepare({
  projectId,
  documentId,
  version,
  onPrepared,
}: {
  projectId: number;
  documentId: number;
  version: number;
  onPrepared: (publicationId: string) => void;
}) {
  const titleId = useId();
  const [attachments, setAttachments] = useState<ArtifactSource[]>([]);
  const attempt = useRef<{
    release?: ArtifactCreateRequest;
    publication?: PublicationPreviewRequest;
  }>({});
  const submissionLock = useRef(false);
  const document = useQuery({
    queryKey: ["requirement-publication-source", projectId, documentId],
    queryFn: () => readSource(projectId, "requirement_document", documentId),
    retry: false,
  });
  const prepare = useMutation({
    mutationFn: async () => {
      const operation = attempt.current;
      if (!operation.release) {
        const input = {
          source: { kind: "requirement_document", id: documentId, version },
          included_sources: attachments,
          projection_version: "internal-preview-v2",
        } as const;
        const preview = await previewRelease(projectId, input);
        operation.release = {
          ...input,
          request_id: crypto.randomUUID(),
          expected_scope_digest: preview.scope_digest,
        };
      }
      if (!operation.publication) {
        const release = await createRelease(projectId, operation.release);
        operation.publication = {
          release_id: release.id,
          projection_version: "public-preview-v2",
          request_id: crypto.randomUUID(),
        };
      }
      const preview = await previewPublication(
        projectId,
        operation.publication,
      );
      return createPublication(projectId, {
        ...operation.publication,
        expected_public_digest: preview.public_digest,
        expected_source_manifest_digest: preview.source_manifest_digest,
      });
    },
    onSuccess: (row) => onPrepared(row.content.id),
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.code === "VERSION_CONFLICT" &&
        !attempt.current.publication
      ) {
        attempt.current = {};
        void document.refetch();
      }
    },
    onSettled: () => {
      submissionLock.current = false;
    },
  });
  if (document.isPending) return <Skeleton className="h-32" />;
  if (document.error)
    return (
      <DataLoadError
        resourceName="要件定義書"
        onRetry={() => void document.refetch()}
      />
    );
  const stale = document.data.version !== version;

  return (
    <form
      method="post"
      aria-labelledby={titleId}
      className="grid max-w-3xl gap-4 rounded-lg border p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (submissionLock.current || stale) return;
        submissionLock.current = true;
        prepare.mutate();
      }}
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {document.data.title}
      </h2>
      <p className="text-sm text-muted-foreground">
        要件定義書全体の公開内容を準備します。準備後に本文を確認し、閲覧を許可する相手を選びます。
      </p>
      <details className="rounded-md border p-3 text-sm">
        <summary className="cursor-pointer">
          添付資料{attachments.length ? `（${attachments.length}件）` : ""}
        </summary>
        <div className="mt-3">
          <IncludedSourcesPicker
            projectId={projectId}
            value={attachments}
            onChange={(value) => {
              attempt.current = {};
              prepare.reset();
              setAttachments(value);
            }}
            disabled={prepare.isPending || stale}
            limit={20}
          />
        </div>
      </details>
      {stale ? (
        <p role="status" className="text-sm text-muted-foreground">
          定義書が更新されました。定義書に戻り、最新の内容を確認してください。
        </p>
      ) : null}
      <FormApiError error={prepare.error} />
      <div>
        <Button type="submit" disabled={prepare.isPending || stale}>
          {prepare.isPending ? "準備中…" : "公開内容を準備"}
        </Button>
      </div>
    </form>
  );
}
