import { UserAvatar } from "@/components/shared/display/user-avatar";
import { ClickableTableRow } from "@/components/shared/tables/clickable-table-row";
import { TableEmptyRow } from "@/components/shared/tables/table-empty-row";
import { TableListSkeleton } from "@/components/shared/tables/table-list-skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserListItem } from "@/lib/api/generated/model";

import { UserSystemRoles } from "../shared/user-system-roles";

type UsersTableProps = {
  users: UserListItem[];
  isLoading: boolean;
};

export function UsersTable({ users, isLoading }: UsersTableProps) {
  if (isLoading) {
    return <TableListSkeleton avatar widths={["w-40", "w-56", "w-14"]} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ユーザー</TableHead>
          <TableHead>部署</TableHead>
          <TableHead>役職</TableHead>
          <TableHead>権限</TableHead>
          <TableHead>状態</TableHead>
          <TableHead>最終ログイン</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length ? (
          users.map((user) => (
            <ClickableTableRow
              key={user.id}
              href={`/system/users/${user.id}`}
            >
              <TableCell>
                <div className="flex min-w-64 items-center gap-3">
                  <UserAvatar name={user.name} src={user.avatar_url} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.department ?? "-"}</TableCell>
              <TableCell>{user.position ?? "-"}</TableCell>
              <TableCell>
                <UserSystemRoles roles={user.system_roles} />
              </TableCell>
              <TableCell>
                <Badge variant={user.is_active ? "secondary" : "outline"}>
                  {user.is_active ? "有効" : "無効"}
                </Badge>
              </TableCell>
              <TableCell>{formatLastLoginAt(user.last_login_at)}</TableCell>
            </ClickableTableRow>
          ))
        ) : (
          <TableEmptyRow colSpan={6} message="条件に一致するユーザーがありません。" />
        )}
      </TableBody>
    </Table>
  );
}

const formatLastLoginAt = (lastLoginAt?: string | null) => {
  if (!lastLoginAt) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(lastLoginAt));
};
