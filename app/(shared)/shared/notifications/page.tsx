import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SharedNotificationsPage } from "@/features/notifications/components/shared-notifications";

export default function Page() {
  if (process.env.NEXT_PUBLIC_FIXED_APPROVAL_NOTIFICATIONS_ENABLED !== "true")
    notFound();
  return (
    <Suspense fallback={<p>通知と閲覧許可を確認しています…</p>}>
      <SharedNotificationsPage />
    </Suspense>
  );
}
