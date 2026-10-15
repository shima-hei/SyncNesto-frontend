import { Badge } from "@/components/ui/badge";
import type { CurrentUserRead, TenantChoice } from "@/lib/api/generated/model";
import { TENANT_ROLE_LABELS } from "@/features/tenants/constants/roles";

import { UserSystemRoles } from "@/features/users/components/shared/user-system-roles";
import { getUserTypeLabel } from "@/features/users/constants/user-types";

type AccountReadonlyInfoProps = {
  user: CurrentUserRead;
  tenant: TenantChoice | null;
};

export function AccountReadonlyInfo({
  user,
  tenant,
}: AccountReadonlyInfoProps) {
  return (
    <dl className="grid max-w-2xl gap-4 text-sm md:grid-cols-2">
      <ReadonlyItem label="メールアドレス" value={user.email} />
      <ReadonlyItem
        label="ユーザー区分"
        value={getUserTypeLabel(user.user_type)}
      />
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
        <dt className="text-muted-foreground">システム運営の役割</dt>
        <dd>
          {user.system_roles?.length ? (
            <UserSystemRoles roles={user.system_roles} />
          ) : (
            "なし"
          )}
        </dd>
      </div>
      <ReadonlyItem label="現在の組織" value={tenant?.name ?? "所属なし"} />
      <ReadonlyItem
        label="組織内の役割"
        value={tenant ? TENANT_ROLE_LABELS[tenant.role_key] : "なし"}
      />
      <div className="flex flex-col gap-1 md:col-span-2">
        <dt className="text-muted-foreground">プロジェクト内の役割</dt>
        <dd>
          各プロジェクトのメンバー画面で確認できます。業務データの操作範囲は、プロジェクトごとの役割で決まります。
        </dd>
      </div>
    </dl>
  );
}

function ReadonlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-all">{value}</dd>
    </div>
  );
}
