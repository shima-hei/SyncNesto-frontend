"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  issueTenantTenantsIssuancePost,
  resendTenantWelcomeTenantsTenantIdWelcomeEmailPost,
  listManagedTenantsTenantsManagementGet,
} from "@/lib/api/generated/tenants/tenants";
import { TextField } from "./organization-page";
import { useTenant } from "../providers/tenant-provider";

export function SystemTenantsPage() {
  const { refreshChoices } = useTenant();
  const client = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [mailTarget, setMailTarget] = useState<{
    id: number;
    name: string;
    email: string;
  } | null>(null);
  const key = ["system", "tenants"];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listManagedTenantsTenantsManagementGet({ signal }),
    retry: false,
  });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      issueTenantTenantsIssuancePost({
        name: String(form.get("tenant_name")),
        slug: String(form.get("slug")),
        owner_email: String(form.get("owner_email")),
        owner_name: String(form.get("owner_name")),
      }),
    onSuccess: (result, form) => {
      void client.invalidateQueries({ queryKey: key });
      refreshChoices();
      setMailTarget({
        id: result.tenant.id,
        name: result.tenant.name,
        email: String(form.get("owner_email")),
      });
      formRef.current?.reset();
      resend.reset();
      if (result.email_delivery === "sent")
        toast.success("組織を発行し、Ownerへ案内メールを送信しました");
      else
        toast.error(
          "組織は発行済みですが、メールを送信できませんでした。送信設定を確認して再送してください。",
        );
    },
  });
  const resend = useMutation({
    mutationFn: (form: FormData) =>
      resendTenantWelcomeTenantsTenantIdWelcomeEmailPost(mailTarget!.id, {
        owner_email: String(form.get("owner_email")),
      }),
    onSuccess: (result) => {
      if (result.email_delivery === "sent")
        toast.success("案内メールを再送しました");
      else
        toast.error(
          "案内メールを送信できませんでした。送信設定を確認してください。",
        );
    },
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="組織の運営管理"
        description="申し込みを確認した後、組織と初期Ownerを発行して案内メールを送信します。"
      />
      {query.isPending ? (
        <Skeleton className="h-32" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="組織"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>組織名</TableHead>
              <TableHead>識別子</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>発行案内</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.slug}</TableCell>
                <TableCell>
                  {tenant.status === "active" ? "有効" : "停止中"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      tenant.status !== "active" ||
                      resend.isPending ||
                      create.isPending
                    }
                    onClick={() => {
                      setMailTarget({
                        id: tenant.id,
                        name: tenant.name,
                        email: "",
                      });
                      resend.reset();
                    }}
                  >
                    案内メール
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <section className="flex max-w-xl flex-col gap-4">
        <h2 className="text-base font-semibold">承認済みの組織を発行</h2>
        <p className="text-sm text-muted-foreground">
          新しいOwnerには7日間有効の初回パスワードをメールで送ります。登録済みのメールアドレスの場合は既存アカウントを使い、パスワードは変更しません。
        </p>
        <form
          ref={formRef}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (create.isPending || resend.isPending) return;
            create.mutate(new FormData(event.currentTarget));
          }}
        >
          <FieldGroup>
            <TextField name="tenant_name" label="組織名" required />
            <TextField
              name="slug"
              label="識別子（小文字・数字・ハイフン）"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={100}
            />
            <TextField
              name="owner_email"
              label="初期Ownerのメールアドレス"
              type="email"
              required
            />
            <TextField
              name="owner_name"
              label="初期Ownerの氏名（新規登録時に使用）"
              required
              maxLength={255}
            />
          </FieldGroup>
          {create.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
          <Button
            className="self-start"
            disabled={create.isPending || resend.isPending}
          >
            組織を発行してメールを送信
          </Button>
        </form>
        {create.data && (
          <p
            role={create.data.email_delivery === "failed" ? "alert" : "status"}
            className="text-sm"
          >
            {create.data.tenant.name}は発行済みです。
            {create.data.email_delivery === "failed"
              ? "案内メールは未送信です。以下から再送してください。"
              : "Ownerへ案内メールを送信しました。"}
          </p>
        )}
      </section>
      {mailTarget && (
        <section
          className="flex max-w-xl flex-col gap-4"
          key={`${mailTarget.id}:${mailTarget.email}`}
        >
          <h2 className="text-base font-semibold">
            {mailTarget.name}の案内メール
          </h2>
          <p className="text-sm text-muted-foreground">
            送信先は、この組織の有効なOwnerに限ります。初回設定前の場合はパスワードを再発行し、以前の初回パスワードとログインを無効にします。設定済みの場合はログイン先の案内だけを送ります。
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (create.isPending || resend.isPending) return;
              resend.mutate(new FormData(event.currentTarget));
            }}
            className="flex flex-col gap-4"
          >
            <TextField
              name="owner_email"
              label="Ownerのメールアドレス"
              type="email"
              required
              defaultValue={mailTarget.email}
            />
            {resend.error && (
              <p role="alert" className="text-sm text-destructive">
                {resend.error.message}
              </p>
            )}
            {resend.data && (
              <p
                role={
                  resend.data.email_delivery === "failed" ? "alert" : "status"
                }
                className="text-sm"
              >
                {resend.data.email_delivery === "sent"
                  ? "案内メールを送信しました。"
                  : "メールを送信できませんでした。送信設定を確認してください。"}
              </p>
            )}
            <Button
              className="self-start"
              variant="outline"
              disabled={resend.isPending || create.isPending}
            >
              案内メールを再送信
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
