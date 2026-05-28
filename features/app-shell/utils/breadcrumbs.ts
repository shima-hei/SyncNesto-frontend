export type BreadcrumbItem = {
  label: string;
  href?: string;
  dynamicType?: "project";
  dynamicId?: number;
};

const SEGMENT_LABELS: Record<string, string> = {
  account: "アカウント",
  documents: "ドキュメント",
  forbidden: "アクセス権限なし",
  help: "ヘルプ",
  joined: "参加プロジェクト",
  management: "プロジェクト管理",
  members: "メンバー",
  projects: "プロジェクト",
  requirements: "要件定義書",
  system: "システム設定",
  tasks: "タスク",
  "test-cases": "テストケース",
  "test-designs": "テスト設計書",
  users: "ユーザー一覧",
};

const TECHNICAL_SEGMENTS = new Set(["items"]);
const LINK_DISABLED_SEGMENTS = new Set(["projects", "system"]);

export const getBreadcrumbItems = (pathname: string): BreadcrumbItem[] => {
  if (pathname === "/") {
    return [{ label: "ホーム" }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const items = segments.reduce<BreadcrumbItem[]>((currentItems, segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const previousSegment = segments[index - 1];
    const nextItem = getBreadcrumbItemForSegment({
      segment,
      previousSegment,
      href,
    });

    return nextItem ? [...currentItems, nextItem] : currentItems;
  }, []);

  return items.length ? markLastItemAsCurrent(items) : [{ label: "Syncnesto" }];
};

export const getProjectIdFromBreadcrumbItems = (
  items: readonly BreadcrumbItem[]
) => {
  return items.find((item) => item.dynamicType === "project")?.dynamicId ?? null;
};

const getBreadcrumbItemForSegment = ({
  segment,
  previousSegment,
  href,
}: {
  segment: string;
  previousSegment?: string;
  href: string;
}): BreadcrumbItem | null => {
  if (TECHNICAL_SEGMENTS.has(segment)) {
    return null;
  }

  if (segment === "new") {
    return {
      label: getNewPageLabel(previousSegment),
    };
  }

  if (segment === "edit") {
    return {
      label: "編集",
    };
  }

  if (isNumericSegment(segment)) {
    return getDynamicBreadcrumbItem({ segment, previousSegment, href });
  }

  return {
    label: SEGMENT_LABELS[segment] ?? formatUnknownSegment(segment),
    href: LINK_DISABLED_SEGMENTS.has(segment) ? undefined : href,
  };
};

const getDynamicBreadcrumbItem = ({
  segment,
  previousSegment,
  href,
}: {
  segment: string;
  previousSegment?: string;
  href: string;
}): BreadcrumbItem | null => {
  const id = Number(segment);

  if (isProjectIdSegment(previousSegment)) {
    return {
      label: "プロジェクト詳細",
      href,
      dynamicType: "project",
      dynamicId: id,
    };
  }

  if (previousSegment === "users") {
    return {
      label: "ユーザー詳細",
      href,
    };
  }

  if (previousSegment === "requirements") {
    return {
      label: "要件定義書詳細",
      href,
    };
  }

  if (previousSegment === "items") {
    return {
      label: "要件詳細",
      href,
    };
  }

  return null;
};

const getNewPageLabel = (previousSegment?: string) => {
  const labels: Record<string, string> = {
    items: "要件登録",
    management: "プロジェクト登録",
    requirements: "要件定義書登録",
    users: "ユーザー登録",
  };

  return previousSegment ? labels[previousSegment] ?? "登録" : "登録";
};

const isProjectIdSegment = (previousSegment?: string) => {
  return previousSegment === "joined" || previousSegment === "management";
};

const isNumericSegment = (segment: string) => {
  return /^\d+$/.test(segment);
};

const formatUnknownSegment = (segment: string) => {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const markLastItemAsCurrent = (items: BreadcrumbItem[]) => {
  return items.map((item, index) =>
    index === items.length - 1 ? { ...item, href: undefined } : item
  );
};
