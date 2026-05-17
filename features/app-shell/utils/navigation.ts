import type { CurrentUserRead } from "@/lib/api/generated/model";
import { hasAnySystemRole } from "@/features/auth/utils/authorization";

import type {
  AppNavigationChildItem,
  AppNavigationItem,
} from "../constants/navigation";

export const getVisibleNavigationItems = (
  items: AppNavigationItem[],
  user: CurrentUserRead | null
) => {
  return items.reduce<AppNavigationItem[]>((visibleItems, item) => {
    if (!canShowNavigationItem(item, user)) {
      return visibleItems;
    }

    const visibleChildren = item.children?.filter((child) =>
      canShowNavigationItem(child, user)
    );

    if (item.children && !visibleChildren?.length) {
      return visibleItems;
    }

    visibleItems.push({
      ...item,
      children: visibleChildren,
    });

    return visibleItems;
  }, []);
};

export const findNavigationItemByPathname = (
  items: AppNavigationItem[],
  pathname: string
) => {
  const flattenedItems = getFlattenedNavigationItems(items);

  return flattenedItems.find((item) => isNavigationItemActive(item, pathname));
};

export const getFlattenedNavigationItems = (items: AppNavigationItem[]) => {
  return items.flatMap((item) => {
    const ownItem = item.href ? [item] : [];
    const children = item.children ?? [];

    return [...ownItem, ...children];
  });
};

export const isNavigationItemActive = (
  item: Pick<AppNavigationItem, "href">,
  pathname: string
) => {
  if (!item.href) {
    return false;
  }

  return item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
};

const canShowNavigationItem = (
  item: AppNavigationItem | AppNavigationChildItem,
  user: CurrentUserRead | null
) => {
  if (!item.requiredSystemRoles?.length) {
    return true;
  }

  return hasAnySystemRole(user, item.requiredSystemRoles);
};
