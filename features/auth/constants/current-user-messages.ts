export const CURRENT_USER_MESSAGES = {
  conflict: "他の更新と競合しました。",
  sessionExpired: "セッションの有効期限が切れました。",
  profile: {
    updateSuccess: "アカウント情報を更新しました。",
    updateError: "アカウント情報の更新に失敗しました。",
  },
  avatar: {
    updateSuccess: "アイコン画像を更新しました。",
    updateError: "アイコン画像の更新に失敗しました。",
    deleteSuccess: "アイコン画像を削除しました。",
    deleteError: "アイコン画像の削除に失敗しました。",
  },
} as const;
