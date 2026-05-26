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
import { formatDateTime } from "@/lib/format/date";
import type { RequirementRead } from "@/lib/api/generated/model";

import {
  RequirementPriorityBadge,
  RequirementStatusBadge,
  RequirementTypeBadge,
} from "../shared/requirement-badges";

type RequirementsTableProps = {
  projectId: number;
  documentId: number;
  requirements: RequirementRead[];
  isLoading: boolean;
};

export function RequirementsTable({
  projectId,
  documentId,
  requirements,
  isLoading,
}: RequirementsTableProps) {
  if (isLoading) {
    return <TableListSkeleton widths={["w-48", "w-24", "w-20", "w-28"]} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>要件</TableHead>
          <TableHead>種別</TableHead>
          <TableHead>優先度</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>担当者</TableHead>
          <TableHead>更新日時</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requirements.length ? (
          requirements.map((requirement) => (
            <ClickableTableRow
              key={requirement.id}
              href={`/projects/joined/${projectId}/requirements/${documentId}/items/${requirement.id}`}
            >
              <TableCell>
                <div className="flex min-w-64 flex-col">
                  <span className="truncate font-medium">{requirement.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {requirement.requirement_code}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <RequirementTypeBadge type={requirement.requirement_type} />
              </TableCell>
              <TableCell>
                <RequirementPriorityBadge priority={requirement.priority} />
              </TableCell>
              <TableCell>
                <RequirementStatusBadge status={requirement.status} />
              </TableCell>
              <TableCell>{requirement.owner_id ?? "-"}</TableCell>
              <TableCell>{formatDateTime(requirement.updated_at)}</TableCell>
            </ClickableTableRow>
          ))
        ) : (
          <TableEmptyRow colSpan={6} message="条件に一致する要件がありません。" />
        )}
      </TableBody>
    </Table>
  );
}
