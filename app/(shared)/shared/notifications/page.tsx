import { Suspense } from "react";
import { SharedNotificationsPage } from "@/features/notifications/components/shared-notifications";

export default function Page() {
  return (
    <Suspense fallback={<p>通知と閲覧許可を確認しています…</p>}>
      <SharedNotificationsPage />
    </Suspense>
  );
}
