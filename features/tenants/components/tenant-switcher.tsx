"use client";

import { useIsMutating } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "../providers/tenant-provider";

export function TenantSwitcher() {
  const { tenant, choices, switchTenant } = useTenant();
  const pending = useIsMutating();
  if (!tenant)
    return <span className="text-sm text-muted-foreground">組織未所属</span>;
  return (
    <Select
      value={String(tenant.id)}
      onValueChange={(id) => switchTenant(Number(id))}
      disabled={choices.length < 2 || pending > 0}
    >
      <SelectTrigger aria-label="現在の組織" className="max-w-44 sm:max-w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {choices.map((choice) => (
            <SelectItem key={choice.id} value={String(choice.id)}>
              {choice.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
