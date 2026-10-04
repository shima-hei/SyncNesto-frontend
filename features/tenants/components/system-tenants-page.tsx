"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  createTenantTenantsPost,
  listManagedTenantsTenantsManagementGet,
} from "@/lib/api/generated/tenants/tenants";
import { TextField } from "./organization-page";
import { useTenant } from "../providers/tenant-provider";

export function SystemTenantsPage() {
  const { refreshChoices } = useTenant();
  const client = useQueryClient();
  const key = ["system", "tenants"];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listManagedTenantsTenantsManagementGet({ signal }),
    retry: false,
  });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      createTenantTenantsPost({
        name: String(form.get("tenant_name")),
        slug: String(form.get("slug")),
        owner_email: String(form.get("owner_email")),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
      refreshChoices();
      toast.success("組織と初期Ownerを作成しました");
    },
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="組織の運営管理"
        description="組織と初期Ownerを作成します。業務内容の閲覧には組織・Projectへの所属が必要です。"
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <section className="flex max-w-xl flex-col gap-4">
        <h2 className="text-base font-semibold">新しい組織を作成</h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
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
              label="初期Ownerの登録済みメールアドレス"
              type="email"
              required
            />
          </FieldGroup>
          {create.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {create.error.message}
            </p>
          ) : null}
          <Button className="self-start" disabled={create.isPending}>
            組織を作成
          </Button>
        </form>
      </section>
    </div>
  );
}
