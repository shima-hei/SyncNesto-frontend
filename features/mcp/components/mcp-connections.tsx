"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  useConnectionsIntegrationsMcpConnectionsGet as useConnections,
  useAvailabilityIntegrationsMcpAvailabilityGet as useAvailability,
  useRevokeConnectionIntegrationsMcpConnectionsConnectionIdDelete as useRevoke,
  getConnectionsIntegrationsMcpConnectionsGetQueryKey as connectionsKey,
} from "@/lib/api/generated/mcp/mcp";

export function McpConnections({ installUrl }: { installUrl?: string }) {
  const connections = useConnections({ query: { retry: false } });
  const availability = useAvailability({ query: { retry: false } });
  const revoke = useRevoke();
  const queryClient = useQueryClient();
  const [disconnectId, setDisconnectId] = useState<string>();
  const ready =
    !!installUrl &&
    availability.data?.can_connect === true &&
    !availability.isError;
  const refreshing = connections.isFetching || availability.isFetching;

  return (
    <section
      aria-labelledby="external-integrations-title"
      className="flex max-w-2xl flex-col gap-4"
    >
      <h2 id="external-integrations-title" className="text-base font-semibold">
        外部サービス連携
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>Codex</CardTitle>
          <CardDescription>
            要件定義・テスト設計の作成とレビュー、タスクや日程の編集をCodexから行えます。
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {installUrl ? "利用可能" : "公開準備中"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            接続するご自身の権限で、許可したプロジェクトだけを操作します。接続は30日間で、いつでも解除できます。
          </p>
          {!installUrl ? (
            <p className="text-sm text-muted-foreground">
              現在、プラグインの公開を準備しています。公開後にこの画面から連携を開始できます。
            </p>
          ) : null}
          {availability.data?.can_connect === false ? (
            <p className="text-sm text-muted-foreground">
              接続できるプロジェクトがありません。閲覧専用・テスト実行専用では利用できません。
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {ready ? (
              <Button asChild>
                <a href={installUrl} target="_blank" rel="noopener noreferrer">
                  Codexと連携
                  <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            ) : (
              <Button disabled>
                {availability.isPending ? "権限を確認中…" : "Codexと連携"}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={refreshing}
              onClick={() => {
                void connections.refetch();
                void availability.refetch();
              }}
            >
              <RefreshCw data-icon="inline-start" />
              接続状態を更新
            </Button>
          </div>
          {installUrl ? (
            <p className="text-xs text-muted-foreground">
              別タブでプラグインを追加し、Syncnestoにログインしてプロジェクトを選択します。完了後、この画面で接続状態を更新してください。
            </p>
          ) : null}
          <FormApiError
            error={availability.error ?? connections.error ?? revoke.error}
          />
          <div className="flex flex-col gap-3" aria-live="polite">
            <h3 className="text-sm font-medium">接続済みのアカウント</h3>
            {connections.isPending ? (
              <div role="status" aria-label="接続を確認しています">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : null}
            {connections.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                接続はありません。
              </p>
            ) : null}
            {connections.data?.map((connection) => {
              const expired =
                new Date(connection.expires_at).getTime() <=
                connections.dataUpdatedAt;
              const inactive = !!connection.revoked_at || expired;
              return (
                <div
                  key={connection.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
                >
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Codex</span>
                      <Badge variant={inactive ? "secondary" : "outline"}>
                        {connection.revoked_at
                          ? "解除済み"
                          : expired
                            ? "期限切れ"
                            : "接続中"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      プロジェクト:{" "}
                      {connection.project_ids.map((id) => `#${id}`).join(", ")}
                    </p>
                    <p className="text-muted-foreground">
                      有効期限:{" "}
                      {new Date(connection.expires_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={inactive || revoke.isPending}
                    aria-label={`プロジェクト ${connection.project_ids.join(", ")} への接続を解除`}
                    onClick={() => setDisconnectId(connection.id)}
                  >
                    接続を解除
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        open={!!disconnectId}
        onOpenChange={(open) => {
          if (!open) setDisconnectId(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Codexとの接続を解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この接続を使った次の操作から、プロジェクトにアクセスできなくなります。再び利用するには連携し直してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={revoke.isPending}
              onClick={() => {
                if (disconnectId)
                  revoke.mutate(
                    { connectionId: disconnectId },
                    {
                      onSuccess: () => {
                        void queryClient.invalidateQueries({
                          queryKey: connectionsKey(),
                        });
                      },
                    },
                  );
              }}
            >
              接続を解除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
