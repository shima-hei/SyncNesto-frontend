"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSectionEdits } from "../../../hooks/use-section-edits";

export function SectionEditNotice({
  projectId,
  documentId,
}: {
  projectId: number;
  documentId: number;
}) {
  const { unsaved } = useSectionEdits(projectId, documentId);
  const [open, setOpen] = useState(false);
  if (!unsaved.length) return null;
  const resume = (id: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "requirements");
    url.searchParams.set("sectionId", String(id));
    url.searchParams.delete("selectedRequirement");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setOpen(false);
  };
  return (
    <>
      <Alert>
        <AlertTitle>未保存の章本文が{unsaved.length}件あります</AlertTitle>
        <AlertDescription>
          <p>
            「文書として読む」・固定版・出力は保存済みの内容です。入力はこのタブ内で保持しています。
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            編集中の章を確認
          </Button>
        </AlertDescription>
      </Alert>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>未保存の章本文</DialogTitle>
            <DialogDescription>
              保存対象は章ごとです。章が削除・変更された場合も、残っている入力をコピーできます。
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-4">
            {unsaved.map((edit) => (
              <li key={edit.section.id} className="flex min-w-0 flex-col gap-2">
                <p className="break-words font-medium">{edit.section.title}</p>
                <details>
                  <summary className="cursor-pointer text-sm">
                    未保存の本文を確認
                  </summary>
                  <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-sm">
                    {edit.content}
                  </pre>
                </details>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resume(edit.section.id)}
                  >
                    この章へ戻る
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(edit.content)
                        .then(() => toast.success("本文をコピーしました。"))
                        .catch(() =>
                          toast.error("本文を選択してコピーしてください。"),
                        )
                    }
                  >
                    本文をコピー
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
