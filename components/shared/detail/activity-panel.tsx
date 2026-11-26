import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ActivityPanel({
  value,
  onValueChange,
  comments,
  history,
  historyLabel = "変更履歴",
  activationMode = "automatic",
}: {
  value: string;
  onValueChange: (value: string) => void;
  comments: ReactNode;
  history: ReactNode;
  historyLabel?: string;
  activationMode?: "automatic" | "manual";
}) {
  return (
    <section
      aria-label="アクティビティ"
      className="min-w-0 space-y-2 border-t pt-4"
    >
      <h2 className="text-sm font-semibold">アクティビティ</h2>
      <Tabs
        value={value}
        onValueChange={onValueChange}
        activationMode={activationMode}
      >
        <TabsList
          aria-label="アクティビティの種類"
          variant="line"
          className="justify-start border-b"
        >
          <TabsTrigger value="comments">コメント</TabsTrigger>
          <TabsTrigger value="history">{historyLabel}</TabsTrigger>
        </TabsList>
        <TabsContent
          value="comments"
          forceMount
          hidden={value !== "comments"}
          className="pt-2"
        >
          {comments}
        </TabsContent>
        <TabsContent value="history" className="pt-2">
          {history}
        </TabsContent>
      </Tabs>
    </section>
  );
}
