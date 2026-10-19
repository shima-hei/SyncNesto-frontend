import { Suspense } from "react";
import { SharedPublicationsList } from "@/features/artifact-publications/components/shared-pages";

export default function SharedPublicationsPage() {
  return (
    <Suspense fallback={<p>閲覧許可を確認しています…</p>}>
      <SharedPublicationsList />
    </Suspense>
  );
}
