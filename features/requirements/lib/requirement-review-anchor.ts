import type { RequirementTargetCommentRead } from "@/lib/api/generated/model";

export type ReviewAnchorScope =
  | "document_preview"
  | "section_review"
  | "section_requirements_review";

export type ReviewAnchorSourceView =
  | "requirement_document_overview_tab"
  | "requirement_document_requirements_tab";

export type ReviewAnchorStatus = "current" | "moved" | "changed" | "missing";

export type RequirementReviewTargetAnchor = {
  scope: ReviewAnchorScope;
  source_view: ReviewAnchorSourceView;
  field: string;
  quote: string;
  start_offset?: number;
  end_offset?: number;
  source_value?: string;
  source_hash?: string;
  document_id?: number;
  section_id?: number | null;
  requirement_id?: number;
  section_version?: number;
  requirement_version?: number;
  preview_target_type?: "document" | "section" | "unassigned_requirements";
  preview_target_id?: number | null;
  label?: string;
};

export const createRequirementReviewAnchor = async ({
  base,
  quote,
  sourceValue,
}: {
  base: Omit<
    RequirementReviewTargetAnchor,
    "quote" | "start_offset" | "end_offset" | "source_value" | "source_hash"
  >;
  quote: string;
  sourceValue: string;
}): Promise<RequirementReviewTargetAnchor> => {
  const normalizedSourceValue = normalizeReviewText(sourceValue);
  const normalizedQuote = normalizeReviewText(quote);
  const startOffset = normalizedSourceValue.indexOf(normalizedQuote);

  return {
    ...base,
    quote: normalizedQuote,
    ...(startOffset >= 0
      ? {
          start_offset: startOffset,
          end_offset: startOffset + normalizedQuote.length,
        }
      : {}),
    source_value: normalizedSourceValue,
    source_hash: await createReviewSourceHash(normalizedSourceValue),
  };
};

export const evaluateRequirementReviewAnchor = (
  targetAnchor: RequirementReviewTargetAnchor,
  currentValue: string,
  currentVersion?: number | null
): ReviewAnchorStatus => {
  const value = normalizeReviewText(currentValue);
  const quote = normalizeReviewText(targetAnchor.quote);
  const expectedAtOffset =
    typeof targetAnchor.start_offset === "number" &&
    typeof targetAnchor.end_offset === "number"
      ? value.slice(targetAnchor.start_offset, targetAnchor.end_offset)
      : "";
  const targetVersion =
    typeof targetAnchor.requirement_version === "number"
      ? targetAnchor.requirement_version
      : targetAnchor.section_version;
  const versionChanged =
    typeof currentVersion === "number" &&
    typeof targetVersion === "number" &&
    currentVersion !== targetVersion;

  if (expectedAtOffset === quote && !versionChanged) {
    return "current";
  }
  if (expectedAtOffset === quote) {
    return "changed";
  }
  if (value.includes(quote)) {
    return "moved";
  }
  return "missing";
};

export const getRequirementReviewAnchorKey = (targetAnchor: {
  scope?: unknown;
  field: unknown;
  preview_target_type?: unknown;
  preview_target_id?: unknown;
  section_id?: unknown;
  requirement_id?: unknown;
}) => {
  return [
    String(targetAnchor.scope ?? "review"),
    String(targetAnchor.preview_target_type ?? "target"),
    String(targetAnchor.preview_target_id ?? "none"),
    String(targetAnchor.section_id ?? "none"),
    String(targetAnchor.requirement_id ?? "none"),
    String(targetAnchor.field),
  ].join(":");
};

export const isSelectionInsideElement = (
  selection: Selection,
  element: HTMLElement
) => {
  if (!selection.rangeCount) {
    return false;
  }

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    return false;
  }

  if (typeof range.intersectsNode === "function") {
    return range.intersectsNode(element);
  }

  return Boolean(
    selection.anchorNode &&
      selection.focusNode &&
      element.contains(selection.anchorNode) &&
      element.contains(selection.focusNode)
  );
};

export const normalizeReviewText = (value: string) => {
  return value.replace(/\s+/g, " ").trim();
};

export const getUnresolvedReviewAnchors = (
  comments: RequirementTargetCommentRead[]
) => {
  return comments
    .filter((comment) => !comment.is_resolved)
    .map((comment) => comment.target_anchor)
    .filter(isRequirementReviewTargetAnchor);
};

export const getReviewHighlightQuotes = ({
  targetAnchors,
  scope,
  field,
  documentId,
  sectionId,
  requirementId,
  previewTargetType,
  previewTargetId,
}: {
  targetAnchors: RequirementReviewTargetAnchor[];
  scope?: ReviewAnchorScope;
  field: string;
  documentId?: number;
  sectionId?: number | null;
  requirementId?: number;
  previewTargetType?: RequirementReviewTargetAnchor["preview_target_type"];
  previewTargetId?: number | null;
}) => {
  return targetAnchors
    .filter((targetAnchor) => {
      return (
        (!scope || targetAnchor.scope === scope) &&
        targetAnchor.field === field &&
        (documentId === undefined || targetAnchor.document_id === documentId) &&
        (sectionId === undefined ||
          (targetAnchor.section_id ?? null) === sectionId) &&
        (requirementId === undefined ||
          targetAnchor.requirement_id === requirementId) &&
        (!previewTargetType ||
          targetAnchor.preview_target_type === previewTargetType) &&
        (previewTargetId === undefined ||
          (targetAnchor.preview_target_id ?? null) === previewTargetId)
      );
    })
    .map((targetAnchor) => targetAnchor.quote)
    .filter((quote) => quote.trim());
};

export const isRequirementReviewTargetAnchor = (
  value: Record<string, unknown> | null | undefined
): value is RequirementReviewTargetAnchor => {
  return Boolean(
    value &&
      typeof value.scope === "string" &&
      typeof value.field === "string" &&
      typeof value.quote === "string"
  );
};

const createReviewSourceHash = async (value: string) => {
  if (!globalThis.crypto?.subtle) {
    return `fallback:${createFallbackHash(value)}`;
  }
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");

  return `sha256:${hex}`;
};

const createFallbackHash = (value: string) => {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
};
