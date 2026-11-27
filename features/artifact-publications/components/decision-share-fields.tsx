"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Input } from "@/components/ui/input";
import type {
  GuestParticipationRead,
  PublicationRead,
  PublicationShareInput,
} from "@/lib/api/generated/model";
import { listRecipients } from "../lib/access-api";

export function readDecisionShare(
  form: FormData,
  publication: PublicationRead,
): PublicationShareInput | null {
  const expiry = new Date(String(form.get("shareExpiry") ?? ""));
  const participantId = String(form.get("shareRecipient") ?? "");
  const version = Number(form.get("shareRecipientVersion"));
  if (
    !participantId ||
    version < 1 ||
    !Number.isFinite(expiry.getTime()) ||
    expiry.getTime() <= Date.now() ||
    expiry.getTime() > Date.parse(String(form.get("shareRecipientExpiry"))) ||
    !form.has("confirmSharing")
  )
    return null;
  return {
    expected_state:
      publication.state === "published" ? "published" : "prepared",
    publication_version: publication.publication_version ?? 1,
    public_digest: publication.content.public_digest,
    confirmed_full_content: true,
    recipients: [
      {
        participation_id: participantId,
        version,
        expires_at: expiry.toISOString(),
        download_allowed: form.has("allowDownload"),
        comment_allowed: form.has("allowComment"),
      },
    ],
  };
}

export function DecisionShareFields({
  projectId,
  publication,
  existingParticipants = [],
}: {
  projectId: number;
  publication: PublicationRead;
  existingParticipants?: string[];
}) {
  const [search, setSearch] = useState("");
  const [recipient, setRecipient] = useState<GuestParticipationRead>();
  const candidates = useQuery({
    queryKey: [
      "publication-access",
      projectId,
      publication.content.id,
      "decision-recipients",
      search,
    ],
    queryFn: ({ signal }) =>
      listRecipients(
        projectId,
        { q: search.trim(), page: 1, page_size: 20 },
        { signal },
      ),
    retry: false,
  });
  const available = (candidates.data?.items ?? []).filter(
    (item) => !existingParticipants.includes(item.id),
  );
  const choices =
    recipient && !available.some((item) => item.id === recipient.id)
      ? [recipient, ...available]
      : available;
  return (
    <div className="grid gap-3 text-sm">
      <label className="grid gap-1">
        ゲストの名前で検索
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={100}
        />
      </label>
      {candidates.error && (
        <DataLoadError
          resourceName="共有先候補"
          onRetry={() => void candidates.refetch()}
        />
      )}
      <label className="grid gap-1">
        共有先
        <select
          name="shareRecipient"
          required
          value={recipient?.id ?? ""}
          onChange={(event) =>
            setRecipient(choices.find((item) => item.id === event.target.value))
          }
          className="min-w-0 rounded-md border bg-background p-2"
        >
          <option value="">
            {candidates.isPending ? "共有先を確認しています…" : "ゲストを選択"}
          </option>
          {choices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.display_label}
            </option>
          ))}
        </select>
      </label>
      <input
        type="hidden"
        name="shareRecipientVersion"
        value={recipient?.version ?? ""}
      />
      <input
        type="hidden"
        name="shareRecipientExpiry"
        value={recipient?.expires_at ?? ""}
      />
      <label className="grid gap-1">
        共有期限
        <Input name="shareExpiry" type="datetime-local" required />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="allowComment" />{" "}
        共有資料へのコメント投稿を許可する
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="allowDownload" />{" "}
        共有添付のダウンロードを許可する
      </label>
      {publication.content.files.length > 0 && (
        <div className="grid gap-1">
          <p>共有される添付ファイル</p>
          <ul className="list-disc break-words pl-5">
            {publication.content.files.map((file) => (
              <li key={file.id}>{file.filename}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="flex items-center gap-2">
        <input type="checkbox" name="confirmSharing" required />{" "}
        固定版の本文と添付の共有範囲を確認しました
      </label>
    </div>
  );
}
