"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { safeVerificationOrigin, verificationHref } from "../lib/navigation";

export function VerificationReturn({ projectId }: { projectId: number }) {
  const params = useSearchParams();
  const href = safeReturn(params.get("verificationReturn"), projectId);
  if (!href) return null;
  return (
    <Button asChild variant="outline" size="sm" className="self-start">
      <Link href={href}>要件の確認表へ戻る</Link>
    </Button>
  );
}

function safeReturn(candidate: string | null, projectId: number) {
  if (!candidate || candidate.length > 8192) return null;
  try {
    const url = new URL(candidate, "https://syncnesto.invalid");
    if (
      url.origin !== "https://syncnesto.invalid" ||
      url.username ||
      url.password ||
      /[\u0000-\u001f\\]/.test(candidate)
    )
      return null;
    const match = url.pathname.match(
      new RegExp(
        `^/projects/joined/${projectId}/requirement-verifications/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$`,
        "i",
      ),
    );
    if (!match) return null;
    const href = new URL(
      verificationHref(
        projectId,
        match[1],
        safeVerificationOrigin(url.searchParams.get("from"), projectId),
      ),
      "https://syncnesto.invalid",
    );
    const row = url.searchParams.get("row");
    if (row && /^[a-f0-9-]{36}$/i.test(row)) href.searchParams.set("row", row);
    return `${href.pathname}${href.search}`;
  } catch {
    return null;
  }
}
