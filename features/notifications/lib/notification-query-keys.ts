export const notificationUnreadCountKey = (
  userId?: number,
  projectId?: number,
) => ["notifications", userId, "unread-count", projectId] as const;
