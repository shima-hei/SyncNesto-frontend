"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSpecificationsProjectsProjectIdSpecificationsGet as listSpecifications } from "@/lib/api/generated/specifications/specifications";
import { listTestDesignsProjectsProjectIdTestDesignsGet as listTestDesigns } from "@/lib/api/generated/test-designs/test-designs";
import type { ArtifactSource } from "@/lib/api/generated/model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";

export function IncludedSourcesPicker({
  projectId,
  value,
  onChange,
  disabled,
}: {
  projectId: number;
  value: ArtifactSource[];
  onChange: (value: ArtifactSource[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const specifications = useQuery({
    queryKey: ["release-support-specifications", projectId, search, page],
    queryFn: () =>
      listSpecifications(projectId, {
        q: search || undefined,
        page,
        page_size: 20,
      }),
    enabled: open,
  });
  const designs = useQuery({
    queryKey: ["release-support-test-designs", projectId],
    queryFn: () => listTestDesigns(projectId),
    enabled: open,
  });
  const choices = [
    ...(specifications.data?.items ?? []).map((item) => ({
      kind: "specification" as const,
      id: item.id,
      version: item.version,
      title: item.title,
    })),
    ...(designs.data ?? [])
      .filter((item) => item.name.includes(search))
      .map((item) => ({
        kind: "test_design" as const,
        id: item.id,
        version: item.version,
        title: item.name,
      })),
  ];
  return (
    <FieldSet disabled={disabled}>
      <FieldLegend>一緒に固定する設計・テスト設計（任意）</FieldLegend>
      <p className="text-sm text-muted-foreground">
        選択した設計本文・因子水準・マトリクスも同じ時点で保存します。
        {value.length}件選択中
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        disabled={disabled}
      >
        {open ? "選択を閉じる" : "設計を選ぶ"}
      </Button>
      {value.length ? (
        <p className="text-sm">
          {value
            .map(
              (item) =>
                `${item.kind === "test_design" ? "テスト設計" : "設計"} #${item.id}・v${item.version}`,
            )
            .join(" ／ ")}
        </p>
      ) : null}
      {open ? (
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="support-search">設計名で検索</FieldLabel>
            <Input
              id="support-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          {specifications.error || designs.error ? (
            <DataLoadError
              resourceName="設計候補"
              onRetry={() => {
                void specifications.refetch();
                void designs.refetch();
              }}
            />
          ) : null}
          {choices.map((item) => (
            <Field key={`${item.kind}:${item.id}`} orientation="horizontal">
              <Checkbox
                id={`support-${item.kind}-${item.id}`}
                checked={value.some(
                  (entry) => entry.kind === item.kind && entry.id === item.id,
                )}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [
                          ...value.filter(
                            (entry) =>
                              entry.kind !== item.kind || entry.id !== item.id,
                          ),
                          {
                            kind: item.kind,
                            id: item.id,
                            version: item.version,
                          },
                        ]
                      : value.filter(
                          (entry) =>
                            entry.kind !== item.kind || entry.id !== item.id,
                        ),
                  )
                }
                disabled={
                  disabled ||
                  (value.length >= 100 &&
                    !value.some(
                      (entry) =>
                        entry.kind === item.kind && entry.id === item.id,
                    ))
                }
              />
              <FieldLabel htmlFor={`support-${item.kind}-${item.id}`}>
                {item.kind === "test_design" ? "テスト設計" : "画面・API設計"}：
                {item.title}（v{item.version}）
              </FieldLabel>
            </Field>
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              前の設計
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page * 20 >= (specifications.data?.total ?? 0)}
              onClick={() => setPage(page + 1)}
            >
              次の設計
            </Button>
          </div>
        </FieldGroup>
      ) : null}
    </FieldSet>
  );
}
