import type { CurrentProjectRoleRead } from "@/lib/api/generated/model";
import {
  BookOpenCheckIcon,
  ClipboardListIcon,
  FileCheck2Icon,
  FileStackIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  PanelsTopLeftIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import {
  canViewProjectFeature,
  canUpdateDocument,
} from "@/features/auth/utils/authorization";

export type JoinedProjectNavigationItem = {
  group: string;
  purpose: string;
  label: string;
  icon: LucideIcon;
  href: (projectId: number) => string;
  canShow: (role: CurrentProjectRoleRead | null) => boolean;
};

export const joinedProjectNavigationItems: JoinedProjectNavigationItem[] = [
  {
    label: "概要",
    icon: LayoutDashboardIcon,
    group: "目標・現在地",
    purpose: "プロジェクトの目的と状況",
    href: (projectId) => `/projects/joined/${projectId}`,
    canShow: canViewProjectFeature,
  },
  {
    label: "メンバー",
    icon: UsersIcon,
    group: "管理・その他",
    purpose: "参加者を確認する",
    href: (projectId) => `/projects/joined/${projectId}/members`,
    canShow: canViewProjectFeature,
  },
  {
    label: "要件定義書",
    icon: BookOpenCheckIcon,
    group: "何を満たすか",
    purpose: "要件と受け入れ条件を確認する",
    href: (projectId) => `/projects/joined/${projectId}/requirements`,
    canShow: canViewProjectFeature,
  },
  {
    label: "タスク",
    icon: ClipboardListIcon,
    group: "誰が・いつ進めるか",
    purpose: "作業・担当・日程を確認する",
    href: (projectId) => `/projects/joined/${projectId}/tasks`,
    canShow: canViewProjectFeature,
  },
  {
    label: "合意・承認",
    icon: ShieldCheckIcon,
    group: "何を満たすか",
    purpose: "判断が必要な内容と合意履歴を確認する",
    href: (projectId) => `/projects/joined/${projectId}/fixed-approvals`,
    canShow: canViewProjectFeature,
  },
  {
    label: "画面・API設計",
    icon: PanelsTopLeftIcon,
    group: "どう作るか",
    purpose: "画面やAPIの設計を確認する",
    href: (projectId) => `/projects/joined/${projectId}/specifications`,
    canShow: canViewProjectFeature,
  },
  {
    label: "テスト設計書",
    icon: FileCheck2Icon,
    group: "どう確かめるか",
    purpose: "テスト項目と組み合わせを設計する",
    href: (projectId) => `/projects/joined/${projectId}/test-designs`,
    canShow: canViewProjectFeature,
  },
  {
    label: "テストケース",
    icon: ListChecksIcon,
    group: "どう確かめるか",
    purpose: "テストを実行し、結果を確認する",
    href: (projectId) => `/projects/joined/${projectId}/test-cases`,
    canShow: canViewProjectFeature,
  },
  {
    label: "ドキュメント",
    icon: FileStackIcon,
    group: "補足の文書・添付",
    purpose: "文書と添付ファイルを確認する",
    href: (projectId) => `/projects/joined/${projectId}/documents`,
    canShow: canViewProjectFeature,
  },
  {
    label: "ごみ箱",
    icon: Trash2Icon,
    group: "管理・その他",
    purpose: "削除した情報を確認・復元する",
    href: (projectId) => `/projects/joined/${projectId}/trash`,
    canShow: canUpdateDocument,
  },
];

export const joinedProjectNavigationGroups = [
  "目標・現在地",
  "何を満たすか",
  "どう作るか",
  "誰が・いつ進めるか",
  "どう確かめるか",
  "補足の文書・添付",
  "管理・その他",
] as const;

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
  if (href === `/projects/joined/${projectId}`) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
