"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import {
  useConsentIntegrationsMcpAuthorizationRequestsRequestIdGet as useConsent,
  useApproveIntegrationsMcpAuthorizationRequestsRequestIdApprovePost as useApprove,
  useDenyIntegrationsMcpAuthorizationRequestsRequestIdDenyPost as useDeny,
} from "@/lib/api/generated/mcp/mcp";
import { mcpCallbackUrl } from "../lib/navigation";

export function McpConsent({
  requestId,
  userName,
}: {
  requestId: string;
  userName: string;
}) {
  const consent = useConsent(requestId, { query: { retry: false } });
  const approve = useApprove();
  const deny = useDeny();
  const [selected, setSelected] = useState<number[]>([]);
  const [navigationError, setNavigationError] = useState<Error>();
  const pending = approve.isPending || deny.isPending;
  const projects = consent.data?.projects ?? [];
  const selectedTenant = projects.find((project) =>
    selected.includes(project.id),
  )?.tenant_id;

  const finish = async (allow: boolean) => {
    setNavigationError(undefined);
    try {
      const result = allow
        ? await approve.mutateAsync({
            requestId,
            data: { project_ids: selected },
          })
        : await deny.mutateAsync({ requestId });
      window.location.assign(mcpCallbackUrl(result.redirect_url));
    } catch (error) {
      if (error instanceof Error) setNavigationError(error);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-4 md:p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Codexとの接続を許可</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-sm">
            <strong>{userName}</strong>{" "}
            として、選択したプロジェクトへのアクセスを許可します。
          </p>
          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <p>
              現在のご自身の権限に応じて、Codexから次の操作ができるようになります。
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                要件定義の参照・下書き作成・箇所を指定したレビューコメント
              </li>
              <li>テスト設計の参照・作成・項目やセルへのレビューコメント</li>
              <li>
                タスクの起票・編集、担当や日程の変更、依存関係・マイルストーンの作成
              </li>
            </ul>
            <p className="mt-3">
              業務データを読み書きできます。接続は30日間で、アカウント画面からいつでも取り消せます。
            </p>
          </div>
          <fieldset
            disabled={pending || consent.isPending}
            className="flex flex-col gap-3"
          >
            <legend className="mb-2 text-sm font-medium">
              許可するプロジェクト（同じ組織内で選択）
            </legend>
            {consent.isPending ? (
              <p role="status">権限を確認しています…</p>
            ) : null}
            {projects.map((project) => (
              <label
                key={project.id}
                className="flex items-start gap-3 rounded-md border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={selected.includes(project.id)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelected((previous) =>
                      checked
                        ? [
                            ...(selectedTenant === project.tenant_id
                              ? previous
                              : []),
                            project.id,
                          ]
                        : previous.filter((id) => id !== project.id),
                    );
                  }}
                />
                <span>
                  <span className="block font-medium">{project.name}</span>
                  <span className="text-muted-foreground">
                    {project.tenant_name}
                  </span>
                </span>
              </label>
            ))}
            {!consent.isPending && !consent.error && !projects.length ? (
              <p className="text-sm text-muted-foreground">
                接続できるプロジェクトがありません。閲覧専用・テスト実行専用の権限では接続できません。
              </p>
            ) : null}
          </fieldset>
          {consent.data ? (
            <p className="text-xs text-muted-foreground">
              この接続要求の期限:{" "}
              {new Date(consent.data.expires_at).toLocaleString("ja-JP")}
            </p>
          ) : null}
          <FormApiError
            error={
              consent.error ?? approve.error ?? deny.error ?? navigationError
            }
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void finish(false)}
            >
              許可しない
            </Button>
            <Button
              disabled={
                !selected.length ||
                selected.length > 20 ||
                pending ||
                !!consent.error
              }
              onClick={() => void finish(true)}
            >
              {pending ? "処理中…" : "選択したプロジェクトに接続"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
