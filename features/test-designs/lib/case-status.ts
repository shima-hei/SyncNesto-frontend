import type { TestCaseRead } from "@/lib/api/generated/model";

type CaseStatusPresentation = {
  key: TestCaseRead["status"];
  label: string;
  rowClassName: string;
  barClassName: string;
};

export const caseStatusByKey = {
  not_run: {
    key: "not_run",
    label: "未実行",
    rowClassName: "",
    barClassName: "bg-[var(--status-neutral-chart)]",
  },
  in_progress: {
    key: "in_progress",
    label: "実施中",
    rowClassName: "bg-[var(--status-progress-bg)]",
    barClassName: "bg-[var(--status-progress-chart)]",
  },
  passed: {
    key: "passed",
    label: "成功",
    rowClassName: "bg-[var(--status-success-bg)]",
    barClassName: "bg-[var(--status-success-chart)]",
  },
  failed: {
    key: "failed",
    label: "失敗",
    rowClassName: "bg-[var(--status-danger-bg)]",
    barClassName: "bg-[var(--status-danger-chart)]",
  },
  blocked: {
    key: "blocked",
    label: "保留",
    rowClassName: "bg-[var(--status-warning-bg)]",
    barClassName: "bg-[var(--status-warning-chart)]",
  },
  not_applicable: {
    key: "not_applicable",
    label: "対象外",
    rowClassName: "bg-[var(--status-info-bg)]",
    barClassName: "bg-[var(--status-info-chart)]",
  },
} as const satisfies Record<TestCaseRead["status"], CaseStatusPresentation>;

export const caseStatusItems = Object.values(caseStatusByKey);
