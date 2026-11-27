import { Suspense } from "react";
import { SharedNotificationsPage } from "@/features/notifications/components/shared-notifications";
import { GuestActivity } from "@/features/guest-workspace/components/guest-activity";

export default function Page() {
  return (
    <Suspense fallback={<p>通知と閲覧許可を確認しています…</p>}>
      <SharedNotificationsPage />
      <GuestActivity />
    </Suspense>
  );
}
