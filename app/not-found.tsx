import { ErrorPage } from "@/components/shared/error-page";

export default function NotFound() {
  return (
    <ErrorPage
      statusCode="404"
      title="ページが見つかりません"
      description="指定されたページは存在しないか、移動された可能性があります。"
    />
  );
}
