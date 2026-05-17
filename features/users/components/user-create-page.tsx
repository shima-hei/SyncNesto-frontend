"use client";

import { userInitialValues } from "../constants/user-form";
import { useCreateUser } from "../hooks/use-create-user";
import { UserForm } from "./user-form";

export function UserCreatePage() {
  const { createUser, isPending, error } = useCreateUser();

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">ユーザー登録</h2>
        <p className="text-sm text-muted-foreground">
          システムへ新しいユーザーを登録します。
        </p>
      </div>
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

