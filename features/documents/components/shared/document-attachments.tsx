"use client";

import { useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  listDocumentAttachmentsProjectsProjectIdDocumentsDocumentIdAttachmentsGet as listAttachments,
  planDocumentAttachmentProjectsProjectIdDocumentsDocumentIdAttachmentsUploadPlanPost as planAttachment,
  completeDocumentAttachmentProjectsProjectIdDocumentsDocumentIdAttachmentsUploadCompletePost as completeAttachment,
  uploadDocumentAttachmentProjectsProjectIdDocumentsDocumentIdAttachmentsPost as uploadAttachment,
  downloadDocumentAttachmentProjectsProjectIdDocumentsDocumentIdAttachmentsAttachmentIdDownloadGet as downloadAttachment,
  deleteDocumentAttachmentProjectsProjectIdDocumentsDocumentIdAttachmentsAttachmentIdDelete as deleteAttachment,
} from "@/lib/api/generated/documents/documents";
import type { DocumentAttachmentRead } from "@/lib/api/generated/model/documentAttachmentRead";
import { fileUploadMetadata, uploadWithPlan } from "@/lib/api/file-upload";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { formatDateTime } from "@/lib/format/date";
import {
  DOCUMENT_FILE_ACCEPT,
  DOCUMENT_FILE_TYPES,
  documentKeys,
} from "../../lib/document";
import { DocumentLoadError } from "./document-feedback";

export function DocumentAttachments({
  projectId,
  documentId,
  canEdit,
}: {
  projectId: number;
  documentId: number;
  canEdit: boolean;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<DocumentAttachmentRead | null>(null);
  const cache = useQueryClient();
  const key = [...documentKeys.detail(projectId, documentId), "attachments"];
  const query = useQuery({
    queryKey: key,
    queryFn: () => listAttachments(projectId, documentId),
  });
  const upload = useMutation({
    mutationFn: async (original: File) => {
      const kind =
        DOCUMENT_FILE_TYPES[
          original.name.split(".").at(-1)?.toLowerCase() ?? ""
        ];
      if (!kind || !original.size || original.size > 20 * 1024 * 1024)
        throw new Error("FILE_INVALID");
      const normalized = new File([original], original.name, { type: kind });
      const plan = await planAttachment(
        projectId,
        documentId,
        fileUploadMetadata(normalized, normalized.name),
      );
      return uploadWithPlan(
        normalized,
        plan,
        () => uploadAttachment(projectId, documentId, { file: normalized }),
        (token) =>
          completeAttachment(projectId, documentId, { upload_token: token }),
      );
    },
    onSuccess: async () => {
      setFile(null);
      if (input.current) input.current.value = "";
      await cache.invalidateQueries({ queryKey: key });
      toast.success("ファイルを添付しました。");
    },
  });
  const download = useMutation({
    mutationFn: (id: string) => downloadAttachment(projectId, documentId, id),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteAttachment(projectId, documentId, id),
    onSuccess: async () => {
      setDeleting(null);
      await cache.invalidateQueries({ queryKey: key });
      toast.success("添付を削除しました。");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {canEdit ? (
        <form
          className="flex flex-wrap items-end gap-3 max-w-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            if (file) upload.mutate(file);
          }}
        >
          <Field className="min-w-0 flex-1">
            <FieldLabel htmlFor={inputId}>添付ファイル</FieldLabel>
            <Input
              ref={input}
              id={inputId}
              type="file"
              accept={DOCUMENT_FILE_ACCEPT}
              disabled={upload.isPending}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                upload.reset();
              }}
            />
            <FieldDescription>
              PDF・PNG・JPEG・WebP・TXT・Markdown・CSV・JSON。1件20MBまで、デモでは5MBまで。1文書20件まで。
            </FieldDescription>
          </Field>
          <Button type="submit" disabled={!file || upload.isPending}>
            {upload.isPending ? "添付中…" : "添付する"}
          </Button>
        </form>
      ) : null}
      <FormApiError
        error={upload.error}
        fallbackMessage="許可された形式と容量を確認して、再度お試しください。"
      />
      <FormApiError error={download.error ?? remove.error} />
      {query.error ? (
        <DocumentLoadError
          error={query.error}
          projectId={projectId}
          retry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <p className="text-muted-foreground">添付を読み込んでいます…</p>
      ) : query.data.length ? (
        <ul className="divide-y">
          {query.data.map((attachment) => (
            <li
              key={attachment.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium break-all">{attachment.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.max(
                    1,
                    Math.ceil(attachment.byte_size / 1024),
                  ).toLocaleString()}
                  KB・{formatDateTime(attachment.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={download.isPending}
                  onClick={() => download.mutate(attachment.id)}
                >
                  ダウンロード
                </Button>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(attachment)}
                  >
                    削除
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">添付ファイルはありません。</p>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="添付を削除しますか"
        description={`${deleting?.filename ?? "ファイル"}がダウンロードできなくなります。`}
        confirmLabel="削除"
        destructive
        isPending={remove.isPending}
        onConfirm={() =>
          deleting
            ? remove.mutateAsync(deleting.id).catch(() => undefined)
            : undefined
        }
      />
    </div>
  );
}
