import { notFound } from "next/navigation";
import { SharedNotificationsPage } from "@/features/notifications/components/shared-notifications";

export default function Page() {
  if (process.env.NEXT_PUBLIC_FIXED_APPROVAL_NOTIFICATIONS_ENABLED !== "true")
    notFound();
  return <SharedNotificationsPage />;
}
