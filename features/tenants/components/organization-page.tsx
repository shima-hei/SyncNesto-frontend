"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import type { TenantMemberRead } from "@/lib/api/generated/model";
import {
  addMemberTenantsCurrentMembersPost,
  createUserTenantsCurrentUsersPost,
  listMembersTenantsCurrentMembersGet,
  removeMemberTenantsCurrentMembersUserIdDelete,
  updateMemberTenantsCurrentMembersUserIdPatch,
  updateTenantTenantsCurrentPatch,
} from "@/lib/api/generated/tenants/tenants";
import { TenantAdminGuard, useTenant } from "../providers/tenant-provider";
import { MemberAccountActions } from "./member-account-actions";

export const TENANT_ROLE_LABELS = {
  tenant_owner: "所有者",
  tenant_admin: "管理者",
  tenant_member: "メンバー",
} as const;
type Role = keyof typeof TENANT_ROLE_LABELS;
const TABS = ["members", "settings"] as const;

export function OrganizationPage() {
  return (
    <TenantAdminGuard>
      <OrganizationContent />
    </TenantAdminGuard>
  );
}

function OrganizationContent() {
  const { tenant, refreshChoices } = useTenant();
  const client = useQueryClient();
  const key = ["tenant", tenant?.id, "members"];
  const members = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => listMembersTenantsCurrentMembersGet({ signal }),
    retry: false,
  });
  const [tab, setTab] = useUrlTabState({
    values: TABS,
    defaultValue: "members",
  });
  const [edit, setEdit] = useState<TenantMemberRead | "add" | "new" | null>(
    null,
  );
  const [removing, setRemoving] = useState<TenantMemberRead | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const remove = useMutation({
    mutationFn: (member: TenantMemberRead) =>
      removeMemberTenantsCurrentMembersUserIdDelete(member.user_id, {
        version: member.version,
      }),
    onSuccess: () => {
      setRemoving(null);
      void client.invalidateQueries({ queryKey: key });
      refreshChoices();
      toast.success("組織から所属を削除しました");
    },
    onError: (error) => toast.error(error.message),
  });
  if (!tenant) return null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tenant.name}
        description="組織内の所属・権限・プロフィールを管理します。"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/organization/audit-logs">監査ログ</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects/management">プロジェクト管理</Link>
            </Button>
          </>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members">メンバー</TabsTrigger>
          <TabsTrigger value="settings">組織設定</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {members.data?.length ?? 0}人 ·
              Projectの業務権限はProject所属で設定
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEdit("add")}>
                登録済みユーザーを追加
              </Button>
              <Button onClick={() => setEdit("new")}>新規ユーザー登録</Button>
            </div>
          </div>
          {members.isPending ? (
            <Skeleton className="h-40" />
          ) : members.isError ? (
            <DataLoadError
              resourceName="メンバー"
              onRetry={() => void members.refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>部署・役職</TableHead>
                  <TableHead>組織Role</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p>{member.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      {[member.department, member.position]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </TableCell>
                    <TableCell>{TENANT_ROLE_LABELS[member.role_key]}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.status === "active" ? "secondary" : "outline"
                        }
                      >
                        {member.status === "active" ? "有効" : "停止中"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            member.role_key === "tenant_owner" &&
                            tenant.role_key !== "tenant_owner"
                          }
                          onClick={() => setEdit(member)}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={
                            member.role_key === "tenant_owner" &&
                            tenant.role_key !== "tenant_owner"
                          }
                          onClick={() => setRemoving(member)}
                        >
                          所属削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        <TabsContent value="settings">
          <OrganizationSettings />
        </TabsContent>
      </Tabs>
      <Dialog
        open={edit !== null}
        onOpenChange={(open) => {
          if (!open && !savingMember) setEdit(null);
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {edit === "new"
                ? "新規ユーザー登録"
                : edit === "add"
                  ? "登録済みユーザーを追加"
                  : "所属を編集"}
            </DialogTitle>
            <DialogDescription>
              {edit === "new"
                ? "初期パスワードは登録直後に一度だけ表示します。"
                : "メール・パスワードは共通のログイン情報です。ここでは組織内の情報を管理します。"}
            </DialogDescription>
          </DialogHeader>
          {edit !== null ? (
            <MemberForm
              key={
                typeof edit === "string" ? edit : `${edit.id}:${edit.version}`
              }
              mode={edit}
              onBusy={setSavingMember}
              busy={savingMember}
              onSaved={() => {
                void client.invalidateQueries({ queryKey: key });
                refreshChoices();
              }}
              onClose={() => setEdit(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <ResourceDeleteDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        resourceName="この組織への所属"
        description={`${removing?.display_name ?? "ユーザー"}の組織内のProject所属も無効になります。他の組織への所属は継続します。`}
        isPending={remove.isPending}
        onConfirm={() => {
          if (removing) return remove.mutateAsync(removing);
        }}
      />
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: Role;
  onChange: (value: Role) => void;
}) {
  const { tenant } = useTenant();
  return (
    <Field>
      <FieldLabel htmlFor="member-role">組織Role</FieldLabel>
      <Select value={value} onValueChange={(value) => onChange(value as Role)}>
        <SelectTrigger id="member-role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {(Object.keys(TENANT_ROLE_LABELS) as Role[])
              .filter(
                (key) =>
                  key !== "tenant_owner" || tenant?.role_key === "tenant_owner",
              )
              .map((key) => (
                <SelectItem key={key} value={key}>
                  {TENANT_ROLE_LABELS[key]}
                </SelectItem>
              ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function MemberForm({
  mode,
  onSaved,
  onClose,
  onBusy,
  busy,
}: {
  mode: TenantMemberRead | "add" | "new";
  onSaved: () => void;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  busy: boolean;
}) {
  const member = typeof mode === "string" ? null : mode;
  const [role, setRole] = useState<Role>(member?.role_key ?? "tenant_member");
  const [status, setStatus] = useState(member?.status ?? "active");
  const [password, setPassword] = useState<string | null>(null);
  const mutation = useMutation({
    onMutate: () => onBusy(true),
    onSettled: () => onBusy(false),
    mutationFn: async (form: FormData) => {
      const email = String(form.get("email") ?? "");
      const profile = {
        display_name: String(form.get("display_name") ?? ""),
        department: String(form.get("department") ?? "") || null,
        position: String(form.get("position") ?? "") || null,
        role_key: role,
      };
      if (mode === "add") {
        await addMemberTenantsCurrentMembersPost({ email, role_key: role });
        return null;
      }
      if (mode === "new")
        return (await createUserTenantsCurrentUsersPost({ email, ...profile }))
          .initial_password;
      await updateMemberTenantsCurrentMembersUserIdPatch(mode.user_id, {
        ...profile,
        version: mode.version,
        status: status === "active" ? "active" : "suspended",
      });
      return null;
    },
    onSuccess: (initialPassword) => {
      onSaved();
      toast.success("保存しました");
      if (initialPassword) setPassword(initialPassword);
      else onClose();
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || mutation.isPending) return;
    mutation.mutate(new FormData(event.currentTarget));
  };
  if (password)
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          本人へ初回パスワードを渡してください。7日間有効で、ログイン後に本人によるパスワード設定が必要です。この画面を閉じると再表示できません。
        </p>
        <Field>
          <FieldLabel htmlFor="initial-password">初回パスワード</FieldLabel>
          <Input
            id="initial-password"
            value={password}
            readOnly
            autoComplete="off"
          />
        </Field>
        <Button
          onClick={() => {
            setPassword(null);
            mutation.reset();
            onClose();
          }}
        >
          確認して閉じる
        </Button>
      </div>
    );
  return (
    <>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FieldGroup>
          {member ? (
            <p className="text-sm text-muted-foreground">{member.email}</p>
          ) : (
            <TextField
              name="email"
              label="メールアドレス（完全一致）"
              type="email"
              required
            />
          )}
          {mode !== "add" ? (
            <>
              <TextField
                name="display_name"
                label="組織内の表示名"
                defaultValue={member?.display_name}
                required
              />
              <TextField
                name="department"
                label="部署"
                defaultValue={member?.department ?? ""}
              />
              <TextField
                name="position"
                label="役職"
                defaultValue={member?.position ?? ""}
              />
            </>
          ) : null}
          <RoleSelect value={role} onChange={setRole} />
          {member ? (
            <Field>
              <FieldLabel htmlFor="member-status">組織内の利用状態</FieldLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="member-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="active">有効</SelectItem>
                    <SelectItem value="suspended">停止</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </FieldGroup>
        {mutation.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy || mutation.isPending}
          >
            キャンセル
          </Button>
          <Button disabled={busy || mutation.isPending}>
            {mutation.isPending ? "保存中…" : "保存"}
          </Button>
        </div>
      </form>
      {member ? (
        <MemberAccountActions member={member} disabled={busy} onBusy={onBusy} />
      ) : null}
    </>
  );
}

export function TextField({
  name,
  label,
  id,
  ...props
}: { name: string; label: string } & React.ComponentProps<typeof Input>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input id={inputId} name={name} maxLength={255} {...props} />
    </Field>
  );
}

function OrganizationSettings() {
  const { tenant } = useTenant();
  const update = useMutation({
    mutationFn: (name: string) =>
      updateTenantTenantsCurrentPatch({ name, version: tenant!.version }),
    onSuccess: () => window.location.reload(),
  });
  if (!tenant) return null;
  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(
          String(new FormData(event.currentTarget).get("organization_name")),
        );
      }}
    >
      <FieldGroup>
        <TextField
          name="organization_name"
          label="組織名"
          defaultValue={tenant.name}
          required
        />
        <Field>
          <FieldLabel>組織識別子</FieldLabel>
          <p className="text-sm">{tenant.slug}</p>
        </Field>
      </FieldGroup>
      {update.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {update.error.message}
        </p>
      ) : null}
      <Button className="self-start" disabled={update.isPending}>
        組織情報を保存
      </Button>
    </form>
  );
}
