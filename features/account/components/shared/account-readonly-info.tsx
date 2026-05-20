import { Badge } from "@/components/ui/badge";
import type { CurrentUserRead } from "@/lib/api/generated/model";

import { UserSystemRoles } from "@/features/users/components/shared/user-system-roles";

type AccountReadonlyInfoProps = {
  user: CurrentUserRead;
};

export function AccountReadonlyInfo({ user }: AccountReadonlyInfoProps) {
  return (
    <dl className="grid max-w-2xl gap-4 text-sm md:grid-cols-2">
      <ReadonlyItem label="メールアドレス" value={user.email} />
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground">状態</dt>
        <dd>
          <Badge variant={user.is_active ? "secondary" : "outline"}>
            {user.is_active ? "有効" : "無効"}
          </Badge>
        </dd>
      </div>
      <ReadonlyItem label="部署" value={user.department ?? "-"} />
      <ReadonlyItem label="役職" value={user.position ?? "-"} />
      <div className="flex flex-col gap-1 md:col-span-2">
        <dt className="text-muted-foreground">権限</dt>
        <dd>
          <UserSystemRoles roles={user.system_roles} />
        </dd>
      </div>
    </dl>
  );
}

function ReadonlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
