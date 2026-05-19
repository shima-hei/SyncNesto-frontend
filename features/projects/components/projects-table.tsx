"use client";

import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectListItem } from "@/lib/api/generated/model";

import { ProjectStatusBadge } from "./project-status-badge";

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
  const router = useRouter();

  if (isLoading) {
    return <ProjectsTableSkeleton />;
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
              <TableRow
                key={project.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => router.push(href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(href);
                  }
                }}
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
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell
              colSpan={5}
              className="h-24 text-center text-muted-foreground"
            >
              条件に一致するプロジェクトがありません。
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export const formatDate = (date?: string | null) => {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
  }).format(new Date(date));
};

export const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
};

function ProjectsTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}
