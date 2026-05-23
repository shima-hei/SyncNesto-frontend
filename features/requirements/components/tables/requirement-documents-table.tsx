"use client";

import { ClickableTableRow } from "@/components/shared/tables/clickable-table-row";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RequirementDocumentRead } from "@/lib/api/generated/model";
import { formatDateTime } from "@/features/projects/components/tables/projects-table";

import { RequirementDocumentStatusBadge } from "../shared/requirement-badges";

type RequirementDocumentsTableProps = {
  projectId: number;
  documents: RequirementDocumentRead[];
  isLoading: boolean;
};

export function RequirementDocumentsTable({
  projectId,
  documents,
  isLoading,
}: RequirementDocumentsTableProps) {
  if (isLoading) {
    return <TableListSkeleton widths={["w-48", "w-24", "w-20", "w-28"]} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>要件定義書</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>対象システム</TableHead>
          <TableHead>更新日時</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.length ? (
          documents.map((document) => (
            <ClickableTableRow
              key={document.id}
              href={`/projects/joined/${projectId}/requirements/${document.id}`}
            >
              <TableCell>
                <div className="flex min-w-64 flex-col">
                  <span className="truncate font-medium">{document.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {document.document_code}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <RequirementDocumentStatusBadge status={document.status} />
              </TableCell>
              <TableCell>{document.target_system_name ?? "-"}</TableCell>
              <TableCell>{formatDateTime(document.updated_at)}</TableCell>
            </ClickableTableRow>
          ))
        ) : (
          <TableEmptyRow
            colSpan={4}
            message="条件に一致する要件定義書がありません。"
          />
        )}
      </TableBody>
    </Table>
  );
}
