import { ErrorPage } from "@/components/shared/error-page";

export default function Page() {
  return (
    <ErrorPage
      statusCode="403"
      title="アクセス権限がありません"
      description="この画面を表示する権限がありません。必要な場合は管理者に確認してください。"
    />
  );
}
