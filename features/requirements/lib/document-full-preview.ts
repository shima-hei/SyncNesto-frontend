import type {
  RequirementRead,
  RequirementSectionRead,
} from "@/lib/api/generated/model";
import type { SectionEdit } from "./section-edit-buffer";

export function isDocumentPreviewComplete(
  requirements: RequirementRead[],
  total: number,
  documentId: number,
) {
  return (
    requirements.length === total &&
    new Set(requirements.map((requirement) => requirement.id)).size === total &&
    requirements.every((requirement) => requirement.document_id === documentId)
  );
}

export function composeDocumentPreview(
  sections: RequirementSectionRead[],
  requirements: RequirementRead[],
  edits: Readonly<Record<number, SectionEdit>>,
  includeUnsaved: boolean,
) {
  const bySection = new Map<number | null, RequirementRead[]>();
  const sectionIds = new Set(sections.map((section) => section.id));
  for (const requirement of requirements) {
    const id = sectionIds.has(requirement.section_id ?? -1)
      ? requirement.section_id!
      : null;
    const group = bySection.get(id) ?? [];
    group.push(requirement);
    bySection.set(id, group);
  }
  const groups = sections
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
    .map((section) => {
      const edit = edits[section.id];
      const dirty = Boolean(
        edit && edit.content !== (edit.section.content ?? ""),
      );
      return {
        id: section.id as number | null,
        title: section.title,
        content:
          includeUnsaved && dirty ? edit.content : (section.content ?? ""),
        version: section.version,
        unsaved: includeUnsaved && dirty,
        requirements: bySection.get(section.id) ?? [],
      };
    });
  const unassigned = bySection.get(null) ?? [];
  if (unassigned.length)
    groups.push({
      id: null,
      title: "章未所属の要件",
      content: "",
      version: 0,
      unsaved: false,
      requirements: unassigned,
    });
  const warnings = Object.values(edits)
    .filter((edit) => edit.content !== (edit.section.content ?? ""))
    .map((edit) => {
      const current = sections.find(
        (section) => section.id === edit.section.id,
      );
      return {
        id: edit.section.id,
        title: edit.section.title,
        message: !current
          ? "章が見つからないため本文に掲載していません。入力は保持しています。"
          : current.version !== edit.section.version
            ? `保存済みは版${current.version}、入力は版${edit.section.version}からの編集です。`
            : edit.error
              ? "保存に失敗した入力を保持しています。"
              : edit.request !== null
                ? "章本文を保存中です。"
                : null,
      };
    })
    .filter((warning) => warning.message !== null);
  return { groups, warnings };
}
