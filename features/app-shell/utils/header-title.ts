import {
  mainNavigation,
  secondaryNavigation,
} from "../constants/navigation";
import { findNavigationItemByPathname } from "./navigation";

const PROJECT_DETAIL_PATH_PATTERN =
  /^\/projects\/(?:joined|management)\/(\d+)(?:\/|$)/;

export const getHeaderTitle = (pathname: string) => {
  const navigationItems = [...mainNavigation, ...secondaryNavigation];
  const currentItem = findNavigationItemByPathname(navigationItems, pathname);

  return currentItem?.title ?? "Syncnesto";
};

export const getProjectIdFromHeaderPathname = (pathname: string) => {
  const match = pathname.match(PROJECT_DETAIL_PATH_PATTERN);
  const projectId = Number(match?.[1]);

  return Number.isInteger(projectId) ? projectId : null;
};
