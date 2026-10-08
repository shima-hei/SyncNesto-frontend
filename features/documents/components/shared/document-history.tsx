"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  listDocumentRevisionsProjectsProjectIdDocumentsDocumentIdRevisionsGet as listRevisions,
  readDocumentRevisionProjectsProjectIdDocumentsDocumentIdRevisionsNumberGet as readRevision,
} from "@/lib/api/generated/documents/documents";
import { formatDateTime } from "@/lib/format/date";
import { documentKeys } from "../../lib/document";
import { DocumentLoadError } from "./document-feedback";

export function DocumentHistory({
  projectId,
  documentId,
  currentVersion,
}: {
  projectId: number;
  documentId: number;
  currentVersion: number;
}) {
  const inputId = useId();
  const [number, setNumber] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const key = documentKeys.detail(projectId, documentId);
  const query = useQuery({
    queryKey: [...key, "revisions"],
    queryFn: () => listRevisions(projectId, documentId),
  });
  const revision = useQuery({
    queryKey: [...key, "revision", selected],
    queryFn: () => readRevision(projectId, documentId, selected!),
    enabled: selected !== null,
    retry: false,
  });
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-muted-foreground">
        保存時のタイトルと本文を確認できます。添付・関連付けは現在の内容を表示します。
      </p>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const value = Number(number);
              if (
                Number.isSafeInteger(value) &&
                value > 0 &&
                value <= currentVersion
              )
                setSelected(value);
            }}
          >
            <Field>
              <FieldLabel htmlFor={inputId}>版番号</FieldLabel>
              <Input
                id={inputId}
                type="number"
                min={1}
                max={currentVersion}
                required
                value={number}
                onChange={(event) => setNumber(event.target.value)}
              />
            </Field>
            <Button variant="outline" type="submit">
              表示
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">最新100版までの一覧</p>
          {query.error ? (
            <DocumentLoadError
              error={query.error}
              projectId={projectId}
              retry={() => void query.refetch()}
            />
          ) : query.isPending ? (
            <p>読み込み中…</p>
          ) : (
            <ol className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {query.data.map((item) => (
                <li key={item.id}>
                  <Button
                    variant={selected === item.number ? "secondary" : "ghost"}
                    className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                    onClick={() => setSelected(item.number)}
                    aria-pressed={selected === item.number}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span>
                        版 {item.number}
                        {item.number === currentVersion ? "（現在）" : ""}
                      </span>
                      <span className="break-words">{item.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(item.created_at)}
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="min-w-0">
          {selected === null ? (
            <p className="py-4 text-muted-foreground">
              確認する版を選択してください。
            </p>
          ) : revision.error ? (
            <DocumentLoadError
              error={revision.error}
              projectId={projectId}
              retry={() => void revision.refetch()}
            />
          ) : revision.isPending ? (
            <p>本文を読み込んでいます…</p>
          ) : revision.data ? (
            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="text-base font-semibold break-words">
                版 {revision.data.number}・{revision.data.title}
              </h2>
              <MarkdownPreview
                value={revision.data.body}
                className="break-words"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
