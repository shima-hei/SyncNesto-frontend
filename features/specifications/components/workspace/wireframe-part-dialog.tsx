"use client";

import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BlocksIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import type {
  WireframeComponent,
  WireframePartContent,
  WireframePartRead,
} from "@/lib/api/generated/model";
import {
  createWireframePart,
  designKey,
  listWireframeParts,
  readWireframePart,
  updateWireframePart,
} from "../../lib/workspace";

type Mode = "insert" | "register" | "update";

type Props = {
  projectId: number;
  canRegister: boolean;
  selection: () => WireframePartContent | null;
  revision: () => WireframePartContent | null;
  placement?: WireframeComponent;
  onApply: (part: WireframePartRead, placement?: WireframeComponent) => boolean;
};

export function WireframePartDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <BlocksIcon />
          共通部品
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>案件の共通部品</DialogTitle>
          <DialogDescription>
            配置ごとに使う版を固定します。変更は、更新操作をした配置に反映されます。
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PartForm
            {...props}
            onBusy={setBusy}
            onClose={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PartForm({
  projectId,
  canRegister,
  selection,
  revision,
  placement,
  onApply,
  onClose,
  onBusy,
}: Props & { onClose: () => void; onBusy: (busy: boolean) => void }) {
  const cache = useQueryClient();
  const nameId = useId();
  const selectId = useId();
  const [mode, setMode] = useState<Mode>("insert");
  const [name, setName] = useState("");
  const [partId, setPartId] = useState("");
  const [message, setMessage] = useState("");
  const [definition, setDefinition] = useState<WireframePartContent | null>(
    null,
  );
  const libraryKey = [...designKey(projectId), "wireframe-parts"];
  const library = useQuery({
    queryKey: libraryKey,
    queryFn: ({ signal }) => listWireframeParts(projectId, { signal }),
  });
  const pin = placement?.part_pin;
  const latest = library.data?.find((part) => part.part_id === pin?.part_id);
  const selected = library.data?.find((part) => part.part_id === partId);
  const apply = (part: WireframePartRead, target?: WireframeComponent) => {
    if (onApply(part, target)) onClose();
    else setMessage("配置後のレイヤー数が上限の200件を超えます。");
  };
  const save = useMutation({
    mutationFn: ({
      action,
      id,
      version,
    }: {
      action: "insert" | "refresh" | "register" | "update";
      id?: string;
      version?: number;
    }) => {
      if (action === "register" && definition)
        return createWireframePart(projectId, { name, content: definition });
      if (action === "update" && id && version && definition)
        return updateWireframePart(projectId, id, {
          name,
          version,
          content: definition,
        });
      if (id) return readWireframePart(projectId, id, { version });
      throw new Error("共通部品を選択してください。");
    },
    onMutate: () => {
      onBusy(true);
      setMessage("");
    },
    onSuccess: (part, { action }) => {
      if (action === "register" || action === "update")
        void cache.invalidateQueries({ queryKey: libraryKey });
      if (action === "register") {
        setPartId(part.part_id);
        setMode("insert");
        setMessage(`${part.name}を版 ${part.version} として登録しました。`);
      } else {
        apply(part, action === "insert" ? undefined : placement);
      }
    },
    onError: (_, { action }) => {
      if (action === "update")
        void cache.invalidateQueries({ queryKey: libraryKey });
    },
    onSettled: () => onBusy(false),
    retry: false,
  });
  const begin = (next: "register" | "update") => {
    const content = next === "register" ? selection() : revision();
    setMessage(
      content ? "" : "部品に含めるレイヤーを1〜199件選択してください。",
    );
    if (!content) return;
    save.reset();
    setName(next === "update" ? (latest?.name ?? "") : "");
    setDefinition(content);
    setMode(next);
  };

  return (
    <div className="space-y-4">
      {mode === "insert" ? (
        <>
          {library.isPending && <p role="status">共通部品を読み込み中…</p>}
          {library.isError && (
            <>
              <FormApiError error={library.error} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void library.refetch()}
              >
                再読み込み
              </Button>
            </>
          )}
          {library.data?.length ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={selectId}>
                配置する部品
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id={selectId}
                  value={partId}
                  disabled={save.isPending}
                  onChange={(event) => setPartId(event.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">部品を選択</option>
                  {library.data.map((part) => (
                    <option key={part.part_id} value={part.part_id}>
                      {part.name} ・ 版 {part.version}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  disabled={!selected || save.isPending}
                  onClick={() =>
                    selected &&
                    save.mutate({
                      action: "insert",
                      id: selected.part_id,
                      version: selected.version,
                    })
                  }
                >
                  アートボードに配置
                </Button>
              </div>
            </div>
          ) : (
            library.data && (
              <p className="text-sm text-muted-foreground">
                登録済みの共通部品はありません。
              </p>
            )
          )}
          {pin && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium">
                {placement.name} ・ 配置版 {pin.version}
              </p>
              {latest && (
                <p className="text-sm text-muted-foreground">
                  ライブラリの最新版 {latest.version}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    save.isPending || !latest || latest.version <= pin.version
                  }
                  onClick={() =>
                    latest &&
                    save.mutate({
                      action: "refresh",
                      id: pin.part_id,
                      version: latest.version,
                    })
                  }
                >
                  最新版をこの配置に反映
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={save.isPending || latest?.version !== pin.version}
                  onClick={() => begin("update")}
                >
                  この配置から新版を登録
                </Button>
              </div>
              {latest && latest.version > pin.version && (
                <p className="text-xs text-muted-foreground">
                  最新版を反映すると部品内の配置・表示が置き換わります。残るレイヤーの項目・イベント関連は引き継がれます。
                </p>
              )}
            </div>
          )}
          {canRegister && (
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => begin("register")}
            >
              選択レイヤーを共通部品に登録
            </Button>
          )}
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({
              action: mode,
              id: pin?.part_id,
              version: pin?.version,
            });
          }}
        >
          <label className="space-y-1 text-sm" htmlFor={nameId}>
            部品名
          </label>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            required
          />
          <p className="text-sm text-muted-foreground">
            {definition?.layers.length}{" "}
            レイヤーを登録します。各画面の項目・イベントとの関連は、配置先で設定できます。
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => {
                save.reset();
                setMode("insert");
              }}
            >
              戻る
            </Button>
            <Button
              type="submit"
              disabled={
                !name.trim() ||
                save.isPending ||
                (mode === "update" && latest?.version !== pin?.version)
              }
            >
              {mode === "register"
                ? "部品を登録"
                : "新版を登録してこの配置に反映"}
            </Button>
          </div>
          {mode === "update" && latest?.version !== pin?.version && (
            <p className="text-sm" role="status">
              新しい版があります。戻って配置に反映してから編集してください。
            </p>
          )}
        </form>
      )}
      {save.isPending && <p role="status">共通部品を処理中…</p>}
      <FormApiError error={save.error} />
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
