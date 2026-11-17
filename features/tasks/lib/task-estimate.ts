export const estimateMethodLabels = {
  simple: "単純見積",
  pert: "3点・PERT",
  triangular: "3点・三角分布",
} as const;

export function parseEstimateHours(value: string) {
  const number = Number(value);
  const minutes = Math.round(number * 60);
  return value.trim() &&
    number >= 0 &&
    Number.isInteger(minutes) &&
    minutes <= 2147483647
    ? minutes
    : null;
}

export function calculateThreePointMinutes(
  method: "pert" | "triangular",
  optimistic: number | null,
  likely: number | null,
  pessimistic: number | null,
) {
  if (
    optimistic === null ||
    likely === null ||
    pessimistic === null ||
    optimistic > likely ||
    likely > pessimistic
  )
    return null;
  return method === "pert"
    ? Math.round((optimistic + 4 * likely + pessimistic) / 6)
    : Math.round((optimistic + likely + pessimistic) / 3);
}
