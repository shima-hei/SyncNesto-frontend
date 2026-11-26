import type { ProjectNavigation } from "@/lib/api/generated/model";
import {
  CalendarRangeIcon,
  FilesIcon,
  FileTextIcon,
  FlaskConicalIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
} from "lucide-react";

export const projectNavigationSections = [
  {
    key: "overview",
    label: "概要",
    icon: LayoutDashboardIcon,
    paths: ["", "activities"],
  },
  {
    key: "requirements",
    label: "要件",
    icon: FileTextIcon,
    paths: [
      "requirements",
      "fixed-approvals",
      "requirement-workflow",
      "requirement-verifications",
      "requirement-verdicts",
    ],
  },
  { key: "design", label: "設計", icon: LayersIcon, paths: ["specifications"] },
  { key: "tasks", label: "タスク", icon: ListChecksIcon, paths: ["tasks"] },
  {
    key: "planning",
    label: "計画",
    icon: CalendarRangeIcon,
    paths: ["planning"],
  },
  {
    key: "tests",
    label: "テスト",
    icon: FlaskConicalIcon,
    paths: ["test-designs", "test-cases"],
  },
  {
    key: "documents",
    label: "資料",
    icon: FilesIcon,
    paths: ["documents", "artifact-releases", "artifact-publications"],
  },
] as const;

export type ProjectSection = (typeof projectNavigationSections)[number];

export const defaultProjectNavigation: ProjectNavigation = {
  items: projectNavigationSections.map(({ key }) => ({
    key,
    placement: "primary",
  })),
  requirements_view: "requirements",
  tests_view: "test-designs",
};

export const projectSubviewLinks = {
  requirements: [
    { path: "requirements", label: "要件定義書" },
    { path: "fixed-approvals", label: "レビュー・承認一覧" },
  ],
  tests: [
    { path: "test-designs", label: "テスト設計書" },
    { path: "test-cases", label: "テストケース" },
  ],
} as const;

export function getProjectSection(pathname: string, projectId: number) {
  return projectNavigationSections.find((section) =>
    section.paths.some((path) =>
      isJoinedProjectNavigationActive(
        pathname,
        getJoinedProjectHref(projectId, path),
        projectId,
      ),
    ),
  )?.key;
}

export function getProjectSectionHref(
  projectId: number,
  section: ProjectSection,
  navigation: ProjectNavigation,
) {
  let target: string = section.paths[0];
  if (section.key === "requirements")
    target = navigation.requirements_view ?? target;
  if (section.key === "tests") target = navigation.tests_view ?? target;
  return getJoinedProjectHref(projectId, target);
}

export function getJoinedProjectHref(projectId: number, path = "") {
  return `/projects/joined/${projectId}${path ? `/${path}` : ""}`;
}

export function getJoinedProjectId(pathname: string): number | null {
  const match = /^\/projects\/joined\/([1-9]\d*)(?:\/|$)/.exec(pathname);
  const id = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function isJoinedProjectNavigationActive(
  pathname: string,
  href: string,
  projectId: number,
): boolean {
  if (href === getJoinedProjectHref(projectId)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
