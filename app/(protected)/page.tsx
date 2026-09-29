import { PageHeader } from "@/components/shared/layout/page-header";
import { NotificationSummary } from "@/components/shared/notifications/notification-summary";

export default function Home() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="ホーム" />
      <NotificationSummary />
    </div>
  );
}
