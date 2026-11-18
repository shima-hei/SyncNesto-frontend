import type {
  TaskEstimateRevisionRead,
  TaskEstimateUpdate,
} from "@/lib/api/generated/model";

export const estimateMethodLabels = {
  simple: "単純見積",
  parametric: "パラメトリック見積",
  analogous: "類推見積",
  pert: "3点・PERT",
  triangular: "3点・三角分布",
} as const;

export const toHourInput = (minutes?: number | null) =>
  minutes == null ? "" : String(Number((minutes / 60).toFixed(4)));

export function parseEstimateHours(value: string) {
  const text = value.trim();
  const number = Number(text);
  let minutes = Math.round(number * 60);
  if (Number.isFinite(number) && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    const [hours, fraction = ""] = text.split(".");
    // Multiply the fractional digits by 60 in base ten so half a minute rounds up exactly.
    let carry = 0;
    let firstDecimal = 0;
    for (let i = fraction.length - 1; i >= 0; i--) {
      const digit = Number(fraction[i]) * 60 + carry;
      carry = Math.floor(digit / 10);
      firstDecimal = digit % 10;
    }
    minutes = Number(hours) * 60 + carry + (firstDecimal >= 5 ? 1 : 0);
  }
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

export function estimateFormValues(revision: TaskEstimateRevisionRead) {
  return {
    method: revision.method ?? "simple",
    hours: toHourInput(revision.minutes),
    optimistic: toHourInput(revision.optimistic_minutes),
    likely: toHourInput(revision.likely_minutes),
    pessimistic: toHourInput(revision.pessimistic_minutes),
    quantity: decimalInput(revision.quantity),
    unitHours: decimalInput(revision.unit_hours),
    referenceWork: revision.reference_work ?? "",
    referenceHours: toHourInput(revision.reference_minutes),
    factor: decimalInput(revision.factor),
    assumptions: revision.assumptions ?? "",
    reason: "",
  };
}

function decimalInput(value?: string | null) {
  return value == null ? "" : String(Number(value));
}

// サーバーと同じ十進数で積算し、積を求めた後に分単位へ丸める。
function scaledDecimal(value: string) {
  const text = value.trim();
  if (!/^(?:\d{1,8}(?:\.\d{0,4})?|\.\d{1,4})$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return BigInt((whole || "0") + fraction.padEnd(4, "0"));
}

function roundedProduct(product: bigint, scale: bigint) {
  const result = Number((product + scale / BigInt(2)) / scale);
  return result <= 2147483647 ? result : null;
}

export function calculateEstimate(
  values: ReturnType<typeof estimateFormValues>,
): {
  minutes: number | null;
  inputs: Partial<TaskEstimateUpdate>;
} {
  switch (values.method) {
    case "simple": {
      const minutes = parseEstimateHours(values.hours);
      return { minutes, inputs: { minutes } };
    }
    case "parametric": {
      const quantity = scaledDecimal(values.quantity),
        unit = scaledDecimal(values.unitHours);
      return {
        minutes:
          quantity === null || unit === null
            ? null
            : roundedProduct(quantity * unit * BigInt(60), BigInt(100000000)),
        inputs: { quantity: values.quantity, unit_hours: values.unitHours },
      };
    }
    case "analogous": {
      const reference = parseEstimateHours(values.referenceHours),
        factor = scaledDecimal(values.factor);
      return {
        minutes:
          reference === null || factor === null
            ? null
            : roundedProduct(BigInt(reference) * factor, BigInt(10000)),
        inputs: {
          reference_work: values.referenceWork.trim(),
          reference_minutes: reference,
          factor: values.factor,
        },
      };
    }
    default: {
      const optimistic = parseEstimateHours(values.optimistic),
        likely = parseEstimateHours(values.likely),
        pessimistic = parseEstimateHours(values.pessimistic);
      return {
        minutes: calculateThreePointMinutes(
          values.method,
          optimistic,
          likely,
          pessimistic,
        ),
        inputs: {
          optimistic_minutes: optimistic,
          likely_minutes: likely,
          pessimistic_minutes: pessimistic,
        },
      };
    }
  }
}

export function estimateInputSummary(revision: TaskEstimateRevisionRead) {
  switch (revision.method) {
    case "parametric":
      return `数量 ${decimalInput(revision.quantity)} × 単位工数 ${decimalInput(revision.unit_hours)} h`;
    case "analogous":
      return `${revision.reference_work} · 参照 ${toHourInput(revision.reference_minutes)} h × 補正係数 ${decimalInput(revision.factor)}`;
    case "pert":
    case "triangular":
      return `楽観 ${toHourInput(revision.optimistic_minutes)} h ／ 最頻 ${toHourInput(revision.likely_minutes)} h ／ 悲観 ${toHourInput(revision.pessimistic_minutes)} h`;
    default:
      return "";
  }
}
