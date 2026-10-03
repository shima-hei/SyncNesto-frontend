export const formatDate = (date?: string | null) => {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
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
