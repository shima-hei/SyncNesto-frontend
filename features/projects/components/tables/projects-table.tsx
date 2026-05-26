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
import type { ProjectListItem } from "@/lib/api/generated/model";
import { formatDate, formatDateTime } from "@/lib/format/date";

import { ProjectStatusBadge } from "../shared/project-status-badge";

type ProjectsTableProps = {
  projects: ProjectListItem[];
  isLoading: boolean;
  detailBasePath: string;
};

export function ProjectsTable({
  projects,
  isLoading,
  detailBasePath,
}: ProjectsTableProps) {
  if (isLoading) {
    return <TableListSkeleton widths={["w-48", "w-24", "w-20", "w-28"]} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>プロジェクト</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>開始日</TableHead>
          <TableHead>終了日</TableHead>
          <TableHead>更新日時</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.length ? (
          projects.map((project) => {
            const href = `${detailBasePath}/${project.id}`;

            return (
              <ClickableTableRow
                key={project.id}
                href={href}
              >
                <TableCell>
                  <div className="flex min-w-64 flex-col">
                    <span className="truncate font-medium">
                      {project.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {project.project_code}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell>{formatDate(project.start_date)}</TableCell>
                <TableCell>{formatDate(project.end_date)}</TableCell>
                <TableCell>{formatDateTime(project.updated_at)}</TableCell>
              </ClickableTableRow>
            );
          })
        ) : (
          <TableEmptyRow
            colSpan={5}
            message="条件に一致するプロジェクトがありません。"
          />
        )}
      </TableBody>
    </Table>
  );
}
