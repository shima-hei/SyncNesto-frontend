"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format/date";
import type { RequirementDetailRead } from "@/lib/api/generated/model";

type RequirementDetailsSectionProps = {
  details: RequirementDetailRead[];
};

export function RequirementDetailsSection({
  details,
}: RequirementDetailsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">詳細</CardTitle>
      </CardHeader>
      <CardContent>
        {details.length ? (
          <div className="flex flex-col gap-3">
            {details.map((detail) => (
              <div key={detail.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">
                    {detail.detail_type} / {formatDateTime(detail.updated_at)}
                  </span>
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(detail.detail_json, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">詳細はありません。</p>
        )}
      </CardContent>
    </Card>
  );
}
