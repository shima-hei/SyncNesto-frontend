"use client";

import { PageHeader } from "@/components/shared/layout/page-header";

import { userInitialValues } from "../../constants/user-form";
import { useCreateUser } from "../../hooks/use-create-user";
import { UserForm } from "../forms/user-form";

export function UserCreatePage() {
  const { createUser, isPending, error } = useCreateUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ユーザー登録"
        description="新しいユーザーを登録します。初回パスワードは7日間有効で、ログイン後に本人によるパスワード設定が必要です。"
      />
      <UserForm
        mode="create"
        initialValues={userInitialValues}
        isPending={isPending}
        error={error}
        onSubmit={createUser}
      />
    </div>
  );
}
