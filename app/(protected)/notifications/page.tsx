import { Suspense } from "react";

import { NotificationsPage } from "@/features/notifications/components/notifications-page";

export default function Page() {
  return (
    <Suspense>
      <NotificationsPage />
    </Suspense>
  );
}
