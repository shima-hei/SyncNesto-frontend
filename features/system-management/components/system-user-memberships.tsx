"use client";

import Link from "next/link";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSystemUserMembershipsSystemUsersUserIdMembershipsGet } from "@/lib/api/generated/system-management/system-management";
import { TENANT_ROLE_LABELS } from "@/features/tenants/constants/roles";
import { useSystemQuery } from "../hooks/use-system-query";

export function SystemUserMemberships({ userId }: { userId: number }) {
  const query = useSystemQuery(["user", userId, "memberships"], ({ signal }) =>
    listSystemUserMembershipsSystemUsersUserIdMembershipsGet(userId, {
      signal,
    }),
  );
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="user-memberships-title"
    >
      <h2 id="user-memberships-title" className="text-base font-semibold">
        所属組織
      </h2>
      {query.isPending ? (
        <Skeleton className="h-24" />
      ) : query.isError ? (
        <DataLoadError
          resourceName="所属組織"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>組織</TableHead>
              <TableHead>組織の状態</TableHead>
              <TableHead>組織内の役割</TableHead>
              <TableHead>所属状態</TableHead>
              <TableHead>組織内の氏名・部署・役職</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.length ? (
              query.data.map((member) => (
                <TableRow key={member.tenant_id}>
                  <TableCell>
                    <Link
                      href={`/system/tenants/${member.tenant_id}`}
                      className="text-primary underline underline-offset-4"
                    >
                      {member.tenant_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.tenant_status === "active"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {member.tenant_status === "active" ? "有効" : "停止中"}
                    </Badge>
                  </TableCell>
                  <TableCell>{TENANT_ROLE_LABELS[member.role_key]}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === "active" ? "secondary" : "outline"
                      }
                    >
                      {member.status === "active" ? "有効" : "停止中"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.display_name}
                    <p className="text-xs text-muted-foreground">
                      {member.department ?? "-"} / {member.position ?? "-"}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmptyRow
                colSpan={5}
                message="所属している組織はありません。"
              />
            )}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
