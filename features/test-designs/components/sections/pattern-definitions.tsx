"use client";

import {
  MessageSquareIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatternNameInput as DefinitionName } from "../shared/pattern-name-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import { type Design, removeFactors } from "../../lib/design";
import { addRow } from "../../lib/sheets";
import {
  addExpectedValue,
  addFactorLevel,
  editMatrix,
  matrixRows,
  removeMatrixRows,
} from "../../lib/matrix";
import {
  commentTargetKey,
  type DesignCommentTarget,
} from "../../lib/pattern-comments";

export function PatternDefinitions({
  design,
  change,
  readOnly,
  counts,
  onComment,
}: {
  design: Design;
  change: (mutate: (d: Design) => void) => void;
  readOnly: boolean;
  counts: Map<string, number>;
  onComment: (target: DesignCommentTarget, label: string) => void;
}) {
  const { confirm, confirmDialogProps } = useConfirmAction();
  const commentButton = (target: DesignCommentTarget, label: string) => (
    <Button
      size="sm"
      variant="ghost"
      aria-label={`${label}のコメント`}
      title={`${label}のコメント ${counts.get(commentTargetKey(target)) ?? 0}件`}
      onClick={() => onComment(target, label)}
    >
      <MessageSquareIcon />
      {(counts.get(commentTargetKey(target)) ?? 0) > 0 && (
        <span className="text-xs">{counts.get(commentTargetKey(target))}</span>
      )}
    </Button>
  );
  const deleteButton = (
    label: string,
    mutate: (d: Design) => void,
    description = "選択状態と関連する値も更新します。保存前は元に戻せます。",
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={readOnly}
          aria-label={`${label}の操作`}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              confirm({
                title: `「${label}」を削除しますか？`,
                description,
                confirmLabel: "削除",
                destructive: true,
                onConfirm: () => change(mutate),
              })
            }
          >
            <Trash2Icon />
            削除
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const rename = (rowId: string, key: string, value: string) =>
    change((d) =>
      editMatrix(d, [
        { row: matrixRows(d).findIndex((row) => row.id === rowId), key, value },
      ]),
    );
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          因子・水準{" "}
          <span className="text-xs font-normal text-muted-foreground">
            {design.factors.length}因子 / {design.levels.length}水準
          </span>
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={readOnly}
          onClick={() => change((d) => addRow(d, "factors"))}
        >
          <PlusIcon data-icon="inline-start" />
          因子を追加
        </Button>
      </div>
      <div className="max-h-[560px] overflow-y-auto divide-y rounded-md border">
        {design.factors.map((factor) => {
          const levels = design.levels.filter(
            (level) => level.factor_id === factor.id,
          );
          return (
            <div key={factor.id} className="p-3">
              <div className="flex items-center gap-1 font-semibold">
                <DefinitionName
                  name={factor.name}
                  names={design.factors
                    .filter((value) => value.id !== factor.id)
                    .map((value) => value.name)}
                  label={`因子名 ${factor.name}`}
                  disabled={readOnly}
                  onCommit={(value) =>
                    rename(
                      levels[0]?.id ?? `factor:${factor.id}`,
                      "factor",
                      value,
                    )
                  }
                />
                {commentButton(
                  {
                    target_type: "factor",
                    target_id: factor.id,
                    field: "name",
                  },
                  `因子 · ${factor.name}`,
                )}
                {deleteButton(
                  factor.name,
                  (d) => removeFactors(d, new Set([factor.id])),
                  "この因子の全水準も削除します。保存前は元に戻せます。",
                )}
              </div>
              <div className="ml-4 border-l pl-3">
                {levels.map((level) => (
                  <div key={level.id} className="flex items-center gap-1">
                    <DefinitionName
                      name={level.name}
                      names={levels
                        .filter((value) => value.id !== level.id)
                        .map((value) => value.name)}
                      label={`水準名 ${factor.name} ${level.name}`}
                      disabled={readOnly}
                      onCommit={(value) => rename(level.id, "level", value)}
                    />
                    {commentButton(
                      {
                        target_type: "factor_level",
                        target_id: level.id,
                        field: "name",
                      },
                      `${factor.name} · ${level.name}`,
                    )}
                    {deleteButton(level.name, (d) =>
                      removeMatrixRows(d, [level.id]),
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={readOnly}
                  onClick={() => change((d) => addFactorLevel(d, factor.id))}
                >
                  <PlusIcon data-icon="inline-start" />
                  水準を追加
                </Button>
              </div>
            </div>
          );
        })}
        {!design.factors.length && (
          <p className="p-4 text-sm text-muted-foreground">
            因子を追加し、その下に水準を定義してください。
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">
          期待値{" "}
          <span className="text-xs font-normal text-muted-foreground">
            組み合わせごとに複数選択できます
          </span>
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={readOnly}
          onClick={() => change(addExpectedValue)}
        >
          <PlusIcon data-icon="inline-start" />
          期待値を追加
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y rounded-md border p-2">
        {(design.expected_values ?? []).map((value) => (
          <div key={value.id} className="flex items-center gap-1">
            <DefinitionName
              name={value.name}
              multiline
              maxLength={20000}
              names={(design.expected_values ?? [])
                .filter((other) => other.id !== value.id)
                .map((other) => other.name)}
              label={`期待値名 ${value.name}`}
              disabled={readOnly}
              onCommit={(name) => rename(`expected:${value.id}`, "level", name)}
            />
            {commentButton(
              {
                target_type: "expected_value",
                target_id: value.id,
                field: "name",
              },
              `期待値 · ${value.name}`,
            )}
            {deleteButton(value.name, (d) =>
              removeMatrixRows(d, [`expected:${value.id}`]),
            )}
          </div>
        ))}
        {!design.expected_values?.length && (
          <p className="p-2 text-sm text-muted-foreground">
            期待値を追加するとマトリクスの下段に表示されます。
          </p>
        )}
      </div>
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}
