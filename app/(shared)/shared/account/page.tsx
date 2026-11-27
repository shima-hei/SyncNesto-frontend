import { AccountPage } from "@/features/account/components/pages/account-page";
import { EmailPreferences } from "@/features/notifications/components/email-preferences";

export default function Page() {
  return (
    <>
      <AccountPage guestWorkspace />
      <EmailPreferences />
    </>
  );
}
