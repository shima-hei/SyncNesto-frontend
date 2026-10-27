import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { getAuthenticatedHome } from "@/features/app-shell/utils/scope";

export default async function Page() {
  redirect(getAuthenticatedHome(await requireUser()));
}
