import type { RequirementReviewAnchor } from "@/lib/api/generated/model";

export type PublicationQuote = {
  nodeId: string;
  anchor: RequirementReviewAnchor;
};

export const publicationQuoteFields: Record<string, readonly string[]> = {
  requirement_document: [
    "title",
    "purpose",
    "project_goal",
    "project_scope",
    "project_completion_criteria",
  ],
  section: ["title", "content"],
  requirement: ["title", "description", "rationale", "acceptance_criteria"],
  specification: ["title", "summary"],
  test_design: ["title"],
};

export const publicationQuoteLabels: Record<string, string> = {
  title: "タイトル",
  purpose: "目的",
  project_goal: "案件ゴール",
  project_scope: "対象範囲・対象外",
  project_completion_criteria: "案件の完了条件",
  content: "本文",
  description: "要件の内容",
  rationale: "背景・理由",
  acceptance_criteria: "受け入れ条件",
  summary: "目的・実現すること",
};

export const publicationQuoteId = (nodeId: string, field: string) =>
  `public-field-${nodeId}-${field}`;

export function quoteFromOffsets(
  field: string,
  value: string,
  start: number,
  end: number,
): RequirementReviewAnchor | null {
  const selected = value.slice(start, end);
  const quote = selected.trim();
  if (!quote || Array.from(quote).length > 1000) return null;
  const offset = start + selected.length - selected.trimStart().length;
  return {
    field,
    quote,
    quote_start: Array.from(value.slice(0, offset)).length,
  };
}

export function quoteFromTextarea(
  field: string,
  value: string,
  input: HTMLTextAreaElement,
) {
  const { selectionStart, selectionEnd } = input;
  if (input.value === value || !value.includes("\r\n"))
    return quoteFromOffsets(field, value, selectionStart, selectionEnd);

  let start = 0;
  let end = 0;
  for (let index = 0; index < selectionEnd; index += 1) {
    end += value[end] === "\r" && value[end + 1] === "\n" ? 2 : 1;
    if (index + 1 === selectionStart) start = end;
  }
  return quoteFromOffsets(field, value, start, end);
}

export function quoteFromSelection(
  selection: Selection,
  element: HTMLElement,
  field: string,
  value: string,
) {
  if (selection.rangeCount !== 1 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  )
    return null;
  const selected = range.toString();
  if (element.textContent === value) {
    const prefix = range.cloneRange();
    prefix.selectNodeContents(element);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    return quoteFromOffsets(field, value, start, start + selected.length);
  }
  const quote = selected.trim();
  const start = value.indexOf(quote);
  if (start < 0 || start !== value.lastIndexOf(quote)) return null;
  return quoteFromOffsets(field, value, start, start + quote.length);
}
