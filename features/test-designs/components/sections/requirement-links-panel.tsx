"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createDesignRequirementLinkProjectsProjectIdTestDesignsDesignIdRequirementLinksPost as createLink,
  deleteDesignRequirementLinkProjectsProjectIdTestDesignsDesignIdRequirementLinksLinkIdDelete as deleteLink,
  listDesignRequirementLinksProjectsProjectIdTestDesignsDesignIdRequirementLinksGet as listLinks,
} from "@/lib/api/generated/test-collaboration/test-collaboration";
import { listRequirementsProjectsProjectIdRequirementsGet as searchRequirements } from "@/lib/api/generated/requirements/requirements";

export function RequirementLinksPanel({
  projectId,
  designId,
  itemId,
  itemCode,
  disabled,
  disabledMessage,
}: {
  projectId: number;
  designId: number;
  itemId: string;
  itemCode: string;
  disabled: boolean;
  disabledMessage?: string;
}) {
  const client = useQueryClient();
  const key = ["design-requirement-links", projectId, designId];
  const [queryText, setQueryText] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const links = useQuery({
    queryKey: key,
    queryFn: () => listLinks(projectId, designId),
  });
  const candidates = useQuery({
    queryKey: ["requirement-link-candidates", projectId, search],
    queryFn: () => searchRequirements(projectId, { q: search, page_size: 50 }),
    enabled: Boolean(search),
  });
  const related = (links.data ?? []).filter((link) => link.item_id === itemId);
  const existing = new Set(related.map((link) => link.requirement_id));

  async function mutate(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({
        queryKey: ["requirement-test-coverage", projectId],
      });
      toast.success(success);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "更新できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border p-3">
      <h3 className="font-semibold">{itemCode} の関連要件</h3>
      {disabledMessage && (
        <p className="text-xs text-muted-foreground">{disabledMessage}</p>
      )}
      {links.isLoading ? (
        <p>読み込み中…</p>
      ) : related.length ? (
        <ul className="mt-2 space-y-2">
          {related.map((link) => (
            <li
              key={link.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <Link
                className="underline"
                href={`/projects/joined/${projectId}/requirements/${link.document_id}/items/${link.requirement_id}`}
              >
                {link.requirement_code} {link.requirement_title}
              </Link>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || busy}
                onClick={() =>
                  void mutate(
                    () => deleteLink(projectId, designId, link.id),
                    "紐付けを解除しました",
                  )
                }
              >
                解除
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          関連要件はありません。
        </p>
      )}
      {!disabled && (
        <div className="mt-3 space-y-2">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(queryText.trim());
            }}
          >
            <Input
              aria-label="紐付ける要件を検索"
              placeholder="要件コード・内容を検索"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
            />
            <Button type="submit" variant="outline">
              検索
            </Button>
          </form>
          {search && (
            <div className="max-h-48 space-y-1 overflow-auto">
              {(candidates.data?.items ?? [])
                .filter((row) => !existing.has(row.id))
                .map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    disabled={busy}
                    className="block w-full rounded border px-2 py-1 text-left text-sm hover:bg-muted"
                    onClick={() =>
                      void mutate(
                        () =>
                          createLink(projectId, designId, {
                            requirement_id: row.id,
                            item_id: itemId,
                          }),
                        "要件を紐付けました",
                      )
                    }
                  >
                    {row.requirement_code} {row.title}
                  </button>
                ))}
              {candidates.data && !candidates.data.items.length && (
                <p className="text-sm text-muted-foreground">
                  該当する要件はありません。
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
