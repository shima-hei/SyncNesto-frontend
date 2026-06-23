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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format/date";
import type { RequirementRead } from "@/lib/api/generated/model";

import {
  REQUIREMENT_PRIORITY_OPTIONS,
  REQUIREMENT_STATUS_OPTIONS,
  getRequirementPriorityLabel,
  getRequirementStatusLabel,
} from "../../constants/requirement-options";
import { useUpdateRequirementListItem } from "../../hooks/use-update-requirement-list-item";
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
  canUpdate: boolean;
  selectedRequirementId?: number | null;
  onSelectRequirement?: (requirementId: number) => void;
};

export function RequirementsTable({
  projectId,
  documentId,
  requirements,
  isLoading,
  canUpdate,
  selectedRequirementId,
  onSelectRequirement,
}: RequirementsTableProps) {
  const { updateRequirementListItem, isPending } =
    useUpdateRequirementListItem(projectId);

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
          requirements.map((requirement) => {
            const cells = (
              <>
                <TableCell>
                  <div className="flex min-w-64 flex-col">
                    <span className="truncate font-medium">
                      {requirement.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {requirement.requirement_code}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <RequirementTypeBadge type={requirement.requirement_type} />
                </TableCell>
                <TableCell>
                  {canUpdate ? (
                    <RequirementInlineSelect
                      value={requirement.priority ?? "must"}
                      label={getRequirementPriorityLabel(requirement.priority)}
                      disabled={isPending}
                      options={REQUIREMENT_PRIORITY_OPTIONS}
                      onValueChange={(priority) =>
                        updateRequirementListItem(requirement, { priority })
                      }
                    />
                  ) : (
                    <RequirementPriorityBadge priority={requirement.priority} />
                  )}
                </TableCell>
                <TableCell>
                  {canUpdate ? (
                    <RequirementInlineSelect
                      value={requirement.status ?? "draft"}
                      label={getRequirementStatusLabel(requirement.status)}
                      disabled={isPending}
                      options={REQUIREMENT_STATUS_OPTIONS}
                      onValueChange={(status) =>
                        updateRequirementListItem(requirement, { status })
                      }
                    />
                  ) : (
                    <RequirementStatusBadge status={requirement.status} />
                  )}
                </TableCell>
                <TableCell>{requirement.owner_id ?? "-"}</TableCell>
                <TableCell>{formatDateTime(requirement.updated_at)}</TableCell>
              </>
            );

            if (onSelectRequirement) {
              const isSelected = selectedRequirementId === requirement.id;

              return (
                <TableRow
                  key={requirement.id}
                  tabIndex={0}
                  data-state={isSelected ? "selected" : undefined}
                  className="cursor-pointer data-[state=selected]:bg-muted"
                  onClick={() => onSelectRequirement(requirement.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectRequirement(requirement.id);
                    }
                  }}
                >
                  {cells}
                </TableRow>
              );
            }

            return (
              <ClickableTableRow
                key={requirement.id}
                href={`/projects/joined/${projectId}/requirements/${documentId}/items/${requirement.id}`}
              >
                {cells}
              </ClickableTableRow>
            );
          })
        ) : (
          <TableEmptyRow colSpan={6} message="条件に一致する要件がありません。" />
        )}
      </TableBody>
    </Table>
  );
}

function RequirementInlineSelect({
  value,
  label,
  disabled,
  options,
  onValueChange,
}: {
  value: string;
  label: string;
  disabled: boolean;
  options: readonly { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Select value={value} disabled={disabled} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-32">
          <SelectValue>{label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
