"use client";

import { Button } from "@/components/ui/button";

type ProjectFeaturePlaceholderPageProps = {
  title: string;
  description: string;
};

export function ProjectFeaturePlaceholderPage({
  title,
  description,
}: ProjectFeaturePlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        この画面は後続タスクで実装します。
      </div>
      <div>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          戻る
        </Button>
      </div>
    </div>
  );
}
