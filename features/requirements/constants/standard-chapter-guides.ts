export const STANDARD_CHAPTER_GUIDES = {
  overview: {
    prompts: ["誰の、どの課題を解決するか。", "現状と、実現したい状態の違い。"],
    objective: "project_goal",
  },
  scope: {
    prompts: ["今回含める対象と、含めない対象。", "他の仕組みとの境界。"],
    objective: "project_scope",
  },
  business: {
    prompts: ["誰が、どんな場面で利用するか。", "現在と導入後の業務の流れ。"],
    objective: "project_goal",
  },
  functional: {
    prompts: [
      "利用者ができること、入力・処理・結果。",
      "詳細は要件一覧の個別要件へ。",
    ],
    objective: "project_goal",
  },
  non_functional: {
    prompts: [
      "性能・可用性・セキュリティ・運用に必要な条件。",
      "測定方法や数値の根拠。",
    ],
    objective: "project_completion_criteria",
  },
  acceptance: {
    prompts: ["何を確認できれば受け入れ可能か。", "確認方法と合否の判断。"],
    objective: "project_completion_criteria",
  },
  open_issue: {
    prompts: [
      "未決事項、制約、決める担当と期限。",
      "確定済みと未確定を分ける。",
    ],
    objective: "project_scope",
  },
} as const;

export function standardChapterGuide(sectionType: string) {
  if (!Object.hasOwn(STANDARD_CHAPTER_GUIDES, sectionType)) return null;
  return (
    STANDARD_CHAPTER_GUIDES[
      sectionType as keyof typeof STANDARD_CHAPTER_GUIDES
    ] ?? null
  );
}
