import { Badge } from "@/components/ui/badge";
import type { RoleRead } from "@/lib/api/generated/model";

type UserSystemRolesProps = {
  roles?: RoleRead[] | null;
};

export function UserSystemRoles({ roles }: UserSystemRolesProps) {
  if (!roles?.length) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role.key} variant="outline">
          {role.name}
        </Badge>
      ))}
    </div>
  );
}
