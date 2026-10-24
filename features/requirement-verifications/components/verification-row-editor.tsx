"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { VerificationRow } from "@/lib/api/generated/model";
import { listCandidates } from "../lib/api";
import { quoteOffset } from "../lib/navigation";

export function VerificationRowEditor({
  row,
  index,
  disabled,
  description,
  acceptance,
  projectId,
  planId,
  version,
  onChange,
  onRemove,
  onCandidates,
  dirty,
}: {
  row: VerificationRow;
  index: number;
  disabled: boolean;
  description: string;
  acceptance: string;
  projectId: number;
  planId: string;
  version: number;
  onChange: (row: VerificationRow) => void;
  onRemove: () => void;
  onCandidates: () => void;
  dirty: boolean;
}) {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [search, setSearch] = useState("");
  const reference = row.reference ?? { field: "whole" as const };
  const targets = row.targets ?? [];
  const query = useQuery({
    queryKey: [
      "verification-targets",
      tenant?.id,
      user?.id,
      projectId,
      planId,
      version,
    ],
    queryFn: () => listCandidates(projectId, planId),
    enabled: row.method === "test",
    retry: false,
    staleTime: 60_000,
  });
  const options = (
    query.isError ? [] : (query.data?.available_targets ?? [])
  ).filter(
    (target) =>
      typeof target.item_id === "string" &&
      `${target.code} ${target.title}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <FieldSet
        disabled={disabled}
        className="flex min-w-0 flex-col gap-4 rounded-lg border p-4"
      >
        <FieldLegend className="px-1">確認項目 {index + 1}</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${row.id}-content`}>
              何を確かめるか
            </FieldLabel>
            <Textarea
              id={`${row.id}-content`}
              maxLength={4000}
              value={row.description ?? ""}
              onChange={(event) =>
                onChange({ ...row, description: event.target.value })
              }
              placeholder="例：画面を戻っても入力が残る"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${row.id}-reference`}>
              要件本文との対応
            </FieldLabel>
            <Select
              value={reference.field ?? "whole"}
              onValueChange={(field) =>
                onChange({
                  ...row,
                  reference: {
                    field: field as
                      "whole" | "description" | "acceptance_criteria",
                    text: "",
                    start: null,
                  },
                })
              }
              disabled={disabled}
            >
              <SelectTrigger id={`${row.id}-reference`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="whole">固定した要件の全文</SelectItem>
                  <SelectItem value="description">本文から引用する</SelectItem>
                  <SelectItem value="acceptance_criteria">
                    受け入れ条件から引用する
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {reference.field !== "whole" ? (
            <Field
              data-invalid={Boolean(reference.text && reference.start === null)}
            >
              <FieldLabel htmlFor={`${row.id}-quote`}>
                対応する文章の引用
              </FieldLabel>
              <Textarea
                id={`${row.id}-quote`}
                aria-invalid={Boolean(
                  reference.text && reference.start === null,
                )}
                maxLength={4000}
                value={reference.text ?? ""}
                onChange={(event) =>
                  onChange({
                    ...row,
                    reference: {
                      ...reference,
                      text: event.target.value,
                      start: quoteOffset(
                        reference.field === "description"
                          ? description
                          : acceptance,
                        event.target.value,
                      ),
                    },
                  })
                }
              />
              <FieldDescription>
                {reference.text && reference.start === null
                  ? "固定した本文に同じ引用が見つかりません。"
                  : "固定した本文から、そのままの文章を貼り付けます。"}
              </FieldDescription>
            </Field>
          ) : null}
          <Field>
            <FieldLabel>確認方法</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              value={row.method ?? ""}
              disabled={disabled}
              onValueChange={(method) =>
                onChange({
                  ...row,
                  method: (method || null) as VerificationRow["method"],
                })
              }
              className="flex flex-wrap justify-start"
            >
              <ToggleGroupItem value="test">テスト</ToggleGroupItem>
              <ToggleGroupItem value="manual">手動確認</ToggleGroupItem>
              <ToggleGroupItem value="not_applicable">
                対象外候補
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          {row.method === "manual" ? (
            <Field>
              <FieldLabel htmlFor={`${row.id}-manual`}>
                手動でどのように確認するか
              </FieldLabel>
              <Textarea
                id={`${row.id}-manual`}
                maxLength={4000}
                value={row.manual_plan ?? ""}
                onChange={(event) =>
                  onChange({ ...row, manual_plan: event.target.value })
                }
              />
              <FieldDescription>
                ここでは確認の予定を残します。実施記録や証跡の採用は後続の工程です。
              </FieldDescription>
            </Field>
          ) : null}
          {row.method === "not_applicable" ? (
            <Field>
              <FieldLabel htmlFor={`${row.id}-na`}>
                対象外候補とする理由
              </FieldLabel>
              <Textarea
                id={`${row.id}-na`}
                maxLength={4000}
                value={row.not_applicable_reason ?? ""}
                onChange={(event) =>
                  onChange({
                    ...row,
                    not_applicable_reason: event.target.value,
                  })
                }
              />
              <FieldDescription>
                要件やテストを対象外と確定する操作ではありません。
              </FieldDescription>
            </Field>
          ) : null}
          {row.method === "test" ? (
            <FieldSet>
              <FieldLegend>関連するテスト項目</FieldLegend>
              <Field>
                <FieldLabel htmlFor={`${row.id}-search`}>
                  項目を絞り込む
                </FieldLabel>
                <Input
                  id={`${row.id}-search`}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="項目番号・内容で検索"
                />
              </Field>
              {query.isError ? (
                <DataLoadError
                  resourceName="関連テスト項目"
                  onRetry={() => void query.refetch()}
                />
              ) : query.isPending ? (
                <p className="text-sm text-muted-foreground">
                  関連項目を読込中…
                </p>
              ) : null}
              {query.data?.state === "not_evaluated" ? (
                <p className="text-sm text-muted-foreground">
                  関連項目を取得できません。対象数と閲覧権限を確認してください。
                </p>
              ) : null}
              {options.slice(0, 20).map((target) => {
                const id = String(target.item_id);
                const selected = targets.find((t) => t.item_id === id);
                return (
                  <Field key={id} orientation="horizontal">
                    <Checkbox
                      id={`${row.id}-${id}`}
                      checked={Boolean(selected)}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...row,
                          targets: checked
                            ? [
                                ...targets,
                                {
                                  item_id: id,
                                  pattern_scope: "all_enabled",
                                  pattern_ids: [],
                                },
                              ]
                            : targets.filter((t) => t.item_id !== id),
                        })
                      }
                    />
                    <FieldLabel
                      htmlFor={`${row.id}-${id}`}
                      className="break-words"
                    >
                      {String(target.code)} ·{" "}
                      {String(target.title || "内容未入力")}
                      {selected?.pattern_scope === "selected"
                        ? `（選択した${selected.pattern_ids?.length ?? 0}パターン）`
                        : ""}
                    </FieldLabel>
                  </Field>
                );
              })}
              {options.length > 20 ? (
                <FieldDescription>
                  先頭20件を表示しています。検索で絞り込めます。
                </FieldDescription>
              ) : null}
              {!query.isPending &&
              !query.isError &&
              !query.data?.available_targets?.length ? (
                <FieldDescription>
                  有効な関連項目がありません。元の要件の「関連テスト項目」で関連付けてください。
                </FieldDescription>
              ) : null}
              {targets.some(
                (t) =>
                  !(query.data?.available_targets ?? []).some(
                    (v) => v.item_id === t.item_id,
                  ),
              ) && query.isSuccess ? (
                <FieldDescription>
                  現在は利用できない関連項目があります。下の操作で参照を解除して選び直せます。
                </FieldDescription>
              ) : null}
              {targets.length ? (
                <Button
                  variant="ghost"
                  onClick={() => onChange({ ...row, targets: [] })}
                >
                  選んだテスト項目を解除
                </Button>
              ) : null}
              <FieldDescription>
                初期は各項目の全有効パターンを対象にします。保存後の実行候補から、特定のパターンだけを選ぶこともできます。
              </FieldDescription>
            </FieldSet>
          ) : null}
          <details>
            <summary className="cursor-pointer text-sm">補足を追加</summary>
            <Field className="mt-3">
              <FieldLabel htmlFor={`${row.id}-notes`}>補足</FieldLabel>
              <Textarea
                id={`${row.id}-notes`}
                maxLength={8000}
                value={row.notes ?? ""}
                onChange={(event) =>
                  onChange({ ...row, notes: event.target.value })
                }
              />
            </Field>
          </details>
        </FieldGroup>
      </FieldSet>
      <div className="flex flex-wrap gap-2">
        {row.method === "test" ? (
          <Button variant="outline" disabled={dirty} onClick={onCandidates}>
            保存済みの実行候補を見る
          </Button>
        ) : null}
        {!disabled ? (
          <Button variant="ghost" onClick={onRemove}>
            この確認項目を外す
          </Button>
        ) : null}
      </div>
      {dirty && row.method === "test" ? (
        <p className="text-xs text-muted-foreground">
          入力を保存すると、その確認項目の現在のケースと直近実行を参照できます。
        </p>
      ) : null}
    </section>
  );
}
