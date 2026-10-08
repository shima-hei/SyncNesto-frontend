"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import {
  useConnectionsIntegrationsMcpConnectionsGet as useConnections,
  useRevokeConnectionIntegrationsMcpConnectionsConnectionIdDelete as useRevoke,
  getConnectionsIntegrationsMcpConnectionsGetQueryKey as connectionsKey,
} from "@/lib/api/generated/mcp/mcp";

export function McpConnections() {
  const connections = useConnections({ query: { retry: false } });
  const revoke = useRevoke();
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Codex・MCPとの接続</h2>
        <p className="text-sm text-muted-foreground">
          接続した本人の現在の権限で操作します。取り消すと、次の操作から利用できなくなります。
        </p>
      </div>
      {connections.isPending ? (
        <p role="status">接続を確認しています…</p>
      ) : null}
      <FormApiError error={connections.error ?? revoke.error} />
      {connections.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">接続はありません。</p>
      ) : null}
      {connections.data?.map((connection) => {
        const expired = new Date(connection.expires_at).getTime() <= now;
        const inactive = !!connection.revoked_at || expired;
        return (
          <div
            key={connection.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
          >
            <div className="text-sm">
              <p className="font-medium">
                Codex（ローカルMCP）{inactive ? " · 無効" : ""}
              </p>
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
              onClick={() =>
                revoke.mutate(
                  { connectionId: connection.id },
                  {
                    onSuccess: () => {
                      void queryClient.invalidateQueries({
                        queryKey: connectionsKey(),
                      });
                    },
                  },
                )
              }
            >
              接続を取り消す
            </Button>
          </div>
        );
      })}
    </section>
  );
}
