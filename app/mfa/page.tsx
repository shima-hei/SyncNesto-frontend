import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MfaPage } from "@/features/auth/components/mfa/mfa-page";
import { loginReturnPath } from "@/lib/auth/return-path";
import type { MfaFlowRead } from "@/lib/api/generated/model";
import { authenticateBackendRequest } from "@/lib/security/backend";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
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
  if (!response?.ok) redirect("/login?reason=mfa-expired");
  const { next } = await searchParams;
  return (
    <MfaPage
      flow={(await response.json()) as MfaFlowRead}
      returnTo={loginReturnPath(next) ?? "/"}
    />
  );
}
