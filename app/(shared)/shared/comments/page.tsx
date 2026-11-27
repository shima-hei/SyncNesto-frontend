import { PageHeader } from "@/components/shared/layout/page-header";
import { GuestComments } from "@/features/guest-workspace/components/guest-comments";

export default function Page() {
  return (
    <>
      <PageHeader title="コメント" />
      <GuestComments />
    </>
  );
}
