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
