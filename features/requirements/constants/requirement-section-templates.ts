export const REQUIREMENT_SECTION_TEMPLATES = [
  {
    key: "overview",
    label: "サービス概要",
    title: "サービス概要",
    sectionType: "overview",
    content:
      "## 概要\n\n提供する価値、利用者、主要な利用シーンを記載します。\n\n## 背景\n\nこの要件定義書を作成する背景を記載します。",
  },
  {
    key: "business-flow",
    label: "業務フロー",
    title: "業務フロー",
    sectionType: "business",
    content:
      "## 現行業務\n\n現行の業務手順を記載します。\n\n## To-Be業務\n\nシステム導入後の業務手順を記載します。",
  },
  {
    key: "functional-requirements",
    label: "機能要件",
    title: "機能要件",
    sectionType: "functional",
    content:
      "## 対象機能\n\n対象となる機能を記載します。\n\n## 要件一覧\n\n詳細な要件は要件一覧で管理します。",
  },
  {
    key: "non-functional-requirements",
    label: "非機能要件",
    title: "非機能要件",
    sectionType: "non_functional",
    content:
      "## 性能\n\n応答時間、処理件数などを記載します。\n\n## 可用性\n\n稼働時間、障害時の考慮を記載します。\n\n## 運用\n\n監視、バックアップ、保守に関する要件を記載します。",
  },
  {
    key: "security",
    label: "セキュリティ要件",
    title: "セキュリティ要件",
    sectionType: "security",
    content:
      "## 認証\n\nログイン、セッション、パスワード管理の要件を記載します。\n\n## 認可\n\nロール、権限、アクセス制御の要件を記載します。\n\n## 監査\n\n操作ログ、監査ログの要件を記載します。",
  },
  {
    key: "open-issues",
    label: "未決事項",
    title: "未決事項",
    sectionType: "open_issue",
    content:
      "## 未決事項\n\n未決事項は下部の未決事項一覧で管理します。ここには前提や補足を記載します。",
  },
] as const;
