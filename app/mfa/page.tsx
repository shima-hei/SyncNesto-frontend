import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MfaPage } from "@/features/auth/components/mfa/mfa-page";
import { isGuestInvitationPath, loginReturnPath } from "@/lib/auth/return-path";
import type { MfaFlowRead } from "@/lib/api/generated/model";
import { authenticateBackendRequest } from "@/lib/security/backend";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reauth?: string }>;
}) {
  const cookieStore = await cookies();
  const response = await fetch(
    new URL("/auth/flow", process.env.API_BASE_URL ?? "http://localhost:8000"),
    {
      headers: authenticateBackendRequest(
        new Headers({
          Cookie: cookieStore.toString(),
          Accept: "application/json",
        }),
      ),
      cache: "no-store",
    },
  ).catch(() => null);
  const { next, reauth } = await searchParams;
  const returnTo = loginReturnPath(next);
  if (!response?.ok)
    redirect(
      `/login?reason=mfa-expired${returnTo ? `&next=${encodeURIComponent(returnTo)}` : ""}`,
    );
  return (
    <MfaPage
      flow={(await response.json()) as MfaFlowRead}
      returnTo={returnTo ?? "/"}
      allowRecovery={
        !(
          reauth === "invitation" &&
          returnTo &&
          isGuestInvitationPath(returnTo)
        )
      }
    />
  );
}
