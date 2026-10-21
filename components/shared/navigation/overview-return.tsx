"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { safeOverviewReturn } from "@/lib/navigation/overview-origin";
import { readTaskOrigin } from "@/lib/navigation/task-origin";

export function OverviewReturn({ projectId }: { projectId: number }) {
  const params = useSearchParams();
  const target = safeOverviewReturn(params.get("overviewReturn"), projectId);
  if (!target || readTaskOrigin(params, projectId)) return null;
  return (
    <Button variant="outline" size="sm" asChild className="self-start">
      <Link href={target}>概要の選択した要件へ戻る</Link>
    </Button>
  );
}
