import type { PhaseRead } from "@/lib/api/generated/model";

export function getTaskPhaseOptions(
  phases: PhaseRead[],
  value: string,
  retainedValue?: string,
) {
  const options: { value: string; label: string; disabled?: boolean }[] = [
    { value: "unclassified", label: "未分類" },
    { value: "shared", label: "共通作業" },
    ...phases.map((phase) => ({
      value: `phase:${phase.id}`,
      label: `${phase.name}${phase.archived_at ? "（アーカイブ済み）" : ""}`,
      disabled:
        Boolean(phase.archived_at) && retainedValue !== `phase:${phase.id}`,
    })),
  ];
  for (const selected of [retainedValue, value]) {
    if (
      selected?.startsWith("phase:") &&
      !options.some((option) => option.value === selected)
    ) {
      options.push({
        value: selected,
        label: `${selected === retainedValue ? "保存済み" : "選択中"}の工程 #${selected.slice(6)}（候補外）`,
      });
    }
  }
  return options;
}
