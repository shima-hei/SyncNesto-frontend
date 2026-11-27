import { Suspense } from "react";
import { GuestHome } from "@/features/guest-workspace/components/guest-projects";

export default function Page() {
  return (
    <Suspense>
      <GuestHome />
    </Suspense>
  );
}
