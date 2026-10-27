import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { label, records, strings, verdictIssues } from "../lib/verdict";

export function VerdictReadiness({
  value,
}: {
  value: Record<string, unknown>;
}) {
  const rows = records(value.rows);
  return (
    <div className="flex flex-col gap-3">
      {!value.coverage_confirmed ? (
        <Alert>
          <AlertTitle>条件の対応が未確認です</AlertTitle>
          <AlertDescription>
            確認表で対象との対応を確認するまで合格・対象外は確定できません。
          </AlertDescription>
        </Alert>
      ) : null}
      {!rows.length ? (
        <Alert>
          <AlertDescription>
            確認行がありません。0件を合格・対象外にしません。
          </AlertDescription>
        </Alert>
      ) : (
        rows.map((row) => (
          <section key={label(row.row_id)} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 flex-1 break-words">
                {label(row.description) || "確認内容は未入力"}
              </p>
              <Badge
                variant={row.state === "unresolved" ? "destructive" : "outline"}
              >
                {row.state === "satisfied"
                  ? "根拠あり"
                  : row.state === "not_applicable"
                    ? "対象外候補"
                    : "未解決"}
              </Badge>
            </div>
            {strings(row.issues).map((issue) => (
              <p key={issue} className="text-sm text-muted-foreground">
                {verdictIssues[issue] ?? issue}
              </p>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
