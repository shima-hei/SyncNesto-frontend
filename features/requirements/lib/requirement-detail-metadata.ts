import type { RequirementDetailRead } from "@/lib/api/generated/model";

import type { RequirementDetailFormValues } from "../types/requirement-detail-form";

export type RequirementDetailField = {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
};

export type RequirementDetailDefinition = {
  value: string;
  label: string;
  description: string;
  fields: RequirementDetailField[];
};

export const IMPLEMENTATION_UNIT_DETAIL_TYPE = "implementation_unit";
export const SCREEN_OPERATION_DETAIL_TYPE = "screen_operation";
export const INPUT_DETAIL_TYPE = "input_items";
export const DISPLAY_DETAIL_TYPE = "display_items";
export const PARENT_UNIT_FIELD = "parent_unit_id";
export const PARENT_SCREEN_FIELD = "parent_screen_id";
export const UNIT_ID_FIELD = "unit_id";
export const SCREEN_ID_FIELD = "screen_id";

export const REQUIREMENT_DETAIL_DEFINITIONS: readonly RequirementDetailDefinition[] =
  [
    {
      value: IMPLEMENTATION_UNIT_DETAIL_TYPE,
      label: "実現単位",
      description: "この要件を満たすためのひとまとまりの振る舞いを記録します。",
      fields: [
        {
          key: "title",
          label: "実現単位名",
          placeholder: "例: ユーザーがログインできる",
        },
        {
          key: "summary",
          label: "概要",
          multiline: true,
          placeholder:
            "例: 登録済みユーザーがメールアドレスとパスワードでログインする",
        },
      ],
    },
    {
      value: SCREEN_OPERATION_DETAIL_TYPE,
      label: "画面・操作",
      description: "利用者がどの画面で何を行い、どう完了するかを記録します。",
      fields: [
        {
          key: "screen_name",
          label: "画面名",
          placeholder: "例: ログイン画面",
        },
        { key: "user", label: "利用者", placeholder: "例: 登録済みユーザー" },
        {
          key: "operation",
          label: "操作内容",
          multiline: true,
          placeholder:
            "例: メールアドレスとパスワードを入力してログインボタンを押す",
        },
        {
          key: "completion_condition",
          label: "完了条件",
          multiline: true,
          placeholder: "例: ログイン後にダッシュボードが表示される",
        },
      ],
    },
    {
      value: INPUT_DETAIL_TYPE,
      label: "入力項目",
      description: "ユーザーや担当者が入力する項目と入力ルールを記録します。",
      fields: [
        {
          key: "item_name",
          label: "項目名",
          placeholder: "例: メールアドレス",
        },
        { key: "required", label: "必須条件", placeholder: "例: 必須 / 任意" },
        {
          key: "input_rule",
          label: "入力ルール",
          multiline: true,
          placeholder: "例: メールアドレス形式で入力する。重複登録はできない",
        },
        {
          key: "example",
          label: "入力例",
          placeholder: "例: user@example.com",
        },
      ],
    },
    {
      value: DISPLAY_DETAIL_TYPE,
      label: "表示項目",
      description: "画面や帳票に表示する項目と表示条件を記録します。",
      fields: [
        { key: "item_name", label: "項目名", placeholder: "例: ユーザー名" },
        {
          key: "display_timing",
          label: "表示タイミング",
          placeholder: "例: ログイン後の画面表示時",
        },
        {
          key: "display_rule",
          label: "表示ルール",
          multiline: true,
          placeholder:
            "例: 登録済みの表示名を表示する。未設定の場合はメールアドレスを表示する",
        },
      ],
    },
    {
      value: "business_rule",
      label: "業務ルール",
      description: "条件によって変わる判断や制約を記録します。",
      fields: [
        {
          key: "condition",
          label: "条件",
          multiline: true,
          placeholder: "例: 申請金額が10万円以上の場合",
        },
        {
          key: "rule",
          label: "ルール内容",
          multiline: true,
          placeholder: "例: 部門管理者の承認を必須にする",
        },
        {
          key: "exception",
          label: "例外",
          multiline: true,
          placeholder: "例: 緊急申請の場合は事後承認を許可する",
        },
      ],
    },
    {
      value: "exception_error",
      label: "例外・エラー",
      description: "エラー時や例外ケースの扱いを記録します。",
      fields: [
        {
          key: "case",
          label: "発生条件",
          multiline: true,
          placeholder: "例: パスワードを5回連続で間違えた場合",
        },
        {
          key: "message",
          label: "表示メッセージ",
          multiline: true,
          placeholder: "例: アカウントが一時的にロックされました",
        },
        {
          key: "handling",
          label: "対応内容",
          multiline: true,
          placeholder: "例: 30分後に再試行できる。管理者はロック解除できる",
        },
      ],
    },
    {
      value: "permission_scope",
      label: "権限・公開範囲",
      description: "誰が見られるか、操作できるかを記録します。",
      fields: [
        {
          key: "target_user",
          label: "対象者",
          placeholder: "例: プロジェクト管理者",
        },
        {
          key: "allowed_action",
          label: "許可する操作",
          multiline: true,
          placeholder: "例: メンバーの追加、権限変更、削除ができる",
        },
        {
          key: "restriction",
          label: "制限事項",
          multiline: true,
          placeholder: "例: 自分自身の管理者権限は削除できない",
        },
      ],
    },
    {
      value: "external_integration",
      label: "外部連携",
      description: "外部サービスや他システムとの連携内容を記録します。",
      fields: [
        {
          key: "system_name",
          label: "連携先",
          placeholder: "例: 会計システム",
        },
        {
          key: "timing",
          label: "連携タイミング",
          placeholder: "例: 申請が承認された時",
        },
        {
          key: "data",
          label: "連携する情報",
          multiline: true,
          placeholder: "例: 申請番号、承認日、金額、申請者",
        },
        {
          key: "failure_handling",
          label: "失敗時の扱い",
          multiline: true,
          placeholder: "例: 連携失敗を通知し、手動で再送できるようにする",
        },
      ],
    },
    {
      value: "data",
      label: "データ",
      description: "保存・参照するデータや条件を記録します。",
      fields: [
        {
          key: "data_name",
          label: "データ名",
          placeholder: "例: ユーザー情報",
        },
        {
          key: "stored_content",
          label: "保存する内容",
          multiline: true,
          placeholder: "例: 氏名、メールアドレス、所属部署、権限",
        },
        {
          key: "retention_rule",
          label: "保持・削除ルール",
          multiline: true,
          placeholder: "例: 退会後90日で削除する。監査ログは1年間保持する",
        },
      ],
    },
    {
      value: "other",
      label: "その他",
      description: "分類しにくい実現内容を記録します。",
      fields: [
        { key: "title", label: "見出し", placeholder: "例: 運用上の注意" },
        {
          key: "content",
          label: "内容",
          multiline: true,
          placeholder:
            "例: 初回リリースでは手動運用とし、利用状況を見て自動化を検討する",
        },
      ],
    },
  ] as const;

export const ALL_REQUIREMENT_DETAIL_TYPES = REQUIREMENT_DETAIL_DEFINITIONS.map(
  (definition) => definition.value,
);

export const IMPLEMENTATION_UNIT_CHILD_DETAIL_TYPES =
  ALL_REQUIREMENT_DETAIL_TYPES.filter(
    (detailType) => detailType !== IMPLEMENTATION_UNIT_DETAIL_TYPE,
  );

export const SCREEN_CHILD_DETAIL_TYPES = [
  INPUT_DETAIL_TYPE,
  DISPLAY_DETAIL_TYPE,
] as const;

export const REQUIREMENT_DETAIL_FALLBACK = REQUIREMENT_DETAIL_DEFINITIONS.find(
  (definition) => definition.value === "other",
)!;

const LEGACY_DETAIL_TYPE_LABELS: Record<string, string> = {
  screen: "画面",
  api: "API",
  database: "データベース",
};

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  REQUIREMENT_DETAIL_DEFINITIONS.flatMap((definition) =>
    definition.fields.map((field) => [field.key, field.label]),
  ),
);

export const getRequirementDetailDefinition = (detailType: string) => {
  return (
    REQUIREMENT_DETAIL_DEFINITIONS.find(
      (definition) => definition.value === detailType,
    ) ?? REQUIREMENT_DETAIL_FALLBACK
  );
};

export const getRequirementDetailTypeLabel = (detailType: string) => {
  return (
    REQUIREMENT_DETAIL_DEFINITIONS.find(
      (definition) => definition.value === detailType,
    )?.label ??
    LEGACY_DETAIL_TYPE_LABELS[detailType] ??
    detailType
  );
};

export const getRequirementDetailFieldLabel = (fieldKey: string) => {
  return FIELD_LABELS[fieldKey] ?? humanizeFieldKey(fieldKey);
};

export const getRequirementDetailTitle = (detail: RequirementDetailRead) => {
  const label = getRequirementDetailTypeLabel(detail.detail_type);
  const title = getRepresentativeDetailValue(
    detail.detail_type,
    detail.detail_json ?? {},
  );

  return title ? `${label}: ${title}` : label;
};

export const groupRequirementDetailsByType = (
  details: RequirementDetailRead[],
) => {
  return details.reduce<
    Array<{
      type: string;
      label: string;
      details: RequirementDetailRead[];
    }>
  >((groups, detail) => {
    const type = detail.detail_type;
    const existingGroup = groups.find((group) => group.type === type);

    if (existingGroup) {
      existingGroup.details.push(detail);
      return groups;
    }

    return [
      ...groups,
      {
        type,
        label: getRequirementDetailTypeLabel(type),
        details: [detail],
      },
    ];
  }, []);
};

export const toRequirementDetailJson = (
  values: RequirementDetailFormValues,
) => {
  if (values.detailType === "other" && values.rawJson.trim()) {
    return parseRequirementDetailJson(values.rawJson);
  }

  const detailJson = Object.fromEntries(
    Object.entries(values.fields)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value),
  );

  if (values.detailType === IMPLEMENTATION_UNIT_DETAIL_TYPE) {
    detailJson[UNIT_ID_FIELD] =
      detailJson[UNIT_ID_FIELD] || createDetailNodeId("unit");
  }

  if (values.detailType === SCREEN_OPERATION_DETAIL_TYPE) {
    detailJson[SCREEN_ID_FIELD] =
      detailJson[SCREEN_ID_FIELD] || createDetailNodeId("screen");
  }

  return detailJson;
};

export const toRequirementDetailType = (
  values: RequirementDetailFormValues,
) => {
  if (values.detailType === "other" && values.rawJson.trim()) {
    return values.sourceDetailType ?? values.detailType;
  }

  return values.detailType;
};

export const parseRequirementDetailJson = (value: string) => {
  const parsedValue: unknown = JSON.parse(value);

  if (
    !parsedValue ||
    typeof parsedValue !== "object" ||
    Array.isArray(parsedValue)
  ) {
    throw new Error("JSONはオブジェクト形式で入力してください。");
  }

  return parsedValue as Record<string, unknown>;
};

export const getRequirementDetailFormValues = (
  detail: RequirementDetailRead,
): RequirementDetailFormValues => {
  return {
    detailType: isKnownDetailType(detail.detail_type)
      ? detail.detail_type
      : "other",
    sourceDetailType: detail.detail_type,
    fields: toStringFields(detail.detail_json ?? {}),
    rawJson: JSON.stringify(detail.detail_json ?? {}, null, 2),
  };
};

export const getDefaultRequirementDetailFormValues = (
  detailType = REQUIREMENT_DETAIL_DEFINITIONS[0].value,
): RequirementDetailFormValues => ({
  detailType,
  sourceDetailType: undefined,
  fields: {},
  rawJson: "",
});

export const getRequirementDetailEntries = (
  detailJson: Record<string, unknown>,
) => {
  return Object.entries(detailJson)
    .filter(([key]) => !INTERNAL_DETAIL_FIELD_KEYS.has(key))
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .map(([key, value]) => ({
      key,
      label: getRequirementDetailFieldLabel(key),
      value: formatDetailValue(value),
    }));
};

const isKnownDetailType = (detailType: string) => {
  return REQUIREMENT_DETAIL_DEFINITIONS.some(
    (definition) => definition.value === detailType,
  );
};

const toStringFields = (detailJson: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(detailJson).map(([key, value]) => [
      key,
      formatDetailValue(value),
    ]),
  );
};

const formatDetailValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map((item) => formatDetailValue(item)).join("、");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value ?? "");
};

const humanizeFieldKey = (fieldKey: string) => {
  return fieldKey.replaceAll("_", " ");
};

const INTERNAL_DETAIL_FIELD_KEYS = new Set([
  UNIT_ID_FIELD,
  SCREEN_ID_FIELD,
  PARENT_UNIT_FIELD,
  PARENT_SCREEN_FIELD,
]);

const REPRESENTATIVE_FIELD_KEYS = [
  "title",
  "screen_name",
  "item_name",
  "condition",
  "case",
  "target_user",
  "system_name",
  "data_name",
] as const;

const getRepresentativeDetailValue = (
  detailType: string,
  detailJson: Record<string, unknown>,
) => {
  const definition = getRequirementDetailDefinition(detailType);
  const candidateKeys = [
    ...definition.fields.map((field) => field.key),
    ...REPRESENTATIVE_FIELD_KEYS,
  ];
  const key = candidateKeys.find((fieldKey) => {
    const value = detailJson[fieldKey];

    return value !== null && value !== undefined && value !== "";
  });

  return key ? formatDetailValue(detailJson[key]) : "";
};

const createDetailNodeId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};
