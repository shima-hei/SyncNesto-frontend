// 予定日の暦日計算では、端末の「今日」を UTC 0時の Date に写して扱う。
export const toCalendarDate = (localTime: Date) => {
  const date = new Date(0);
  date.setUTCFullYear(
    localTime.getFullYear(),
    localTime.getMonth(),
    localTime.getDate(),
  );
  return date;
};

export const toCalendarDateInput = (date: Date) =>
  date.toISOString().slice(0, 10);

export const formatDate = (date?: string | null) => {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(date) ? "UTC" : undefined,
  }).format(new Date(date));
};

export const formatDateTime = (dateTime?: string | null) => {
  if (!dateTime) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
};

export const formatRelativeDate = (dateTime: string, now = new Date()) => {
  const date = new Date(dateTime);
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "たった今";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "昨日";
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}日前`;
  return formatDate(dateTime);
};

export const formatCommentDate = (dateTime: string, now = new Date()) => {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(
    "ja-JP",
    date.toDateString() === now.toDateString()
      ? { timeStyle: "short" }
      : {
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        },
  ).format(date);
};
