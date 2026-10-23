import type { InvitationRead } from "@/lib/api/generated/model";

export const invitationStateLabel = (state: string) =>
  ({
    pending: "返答待ち",
    accepted: "参加済み",
    declined: "辞退",
    revoked: "取消済み",
    expired: "期限切れ",
  })[state] ?? "確認が必要";

export const deliveryStateLabel = (state: string) =>
  ({
    sending: "送信処理中",
    sent: "送信受付済み",
    unknown: "送信結果を確認できません",
    failed: "送信失敗",
  })[state] ?? "確認が必要";

export const invitationDate = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const invitationCommand = (row: Pick<InvitationRead, "version">) => ({
  request_id: crypto.randomUUID(),
  version: row.version,
});

export function invitationTokenFromHash(hash: string): string | undefined {
  if (!/^#token=[A-Za-z0-9_-]{40,200}$/.test(hash)) return undefined;
  return hash.slice(7);
}

export const invitationActorLabel = (event: {
  actor_name: string | null;
  actor_kind: string;
}) =>
  event.actor_name?.trim() ||
  {
    user: "氏名を確認できない利用者",
    email_recipient: "招待メールの確認者",
    delivery: "配送処理",
  }[event.actor_kind] ||
  "操作記録";
