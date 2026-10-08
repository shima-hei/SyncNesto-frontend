import { ApiError } from "@/lib/api/error";

export const API_ERROR_MESSAGES: Record<string, string> = {
  DEMO_LIMIT_REACHED:
    "デモの利用上限に達しました。しばらく待って再度お試しください。",
  APP_ERROR: "処理中にエラーが発生しました。",
  BAD_REQUEST: "リクエスト内容を確認してください。",
  UNAUTHORIZED: "ログインが必要です。",
  AUTHENTICATION_REQUIRED: "ログインが必要です。",
  TOKEN_EXPIRED: "セッションの有効期限が切れました。再度ログインしてください。",
  INVALID_TOKEN: "認証情報が正しくありません。再度ログインしてください。",
  FORBIDDEN: "この操作を行う権限がありません。",
  PASSWORD_CHANGE_REQUIRED:
    "利用を開始する前に、ご自身のパスワードを設定してください。",
  INITIAL_PASSWORD_EXPIRED:
    "初回パスワードの有効期限が切れています。「パスワードを忘れた方」からメールで再設定してください。",
  INITIAL_PASSWORD_REUSE:
    "初回パスワードとは異なるパスワードを設定してください。",
  CSRF_TOKEN_INVALID:
    "認証情報の確認に失敗しました。画面を更新して再度お試しください。",
  NOT_FOUND: "対象のデータが見つかりません。",
  CONFLICT: "データの状態が競合しています。内容を確認してください。",
  DUPLICATE_RESOURCE: "同じ内容のデータが既に存在します。",
  VERSION_CONFLICT: "他の更新と競合しました。内容を確認してください。",
  LAST_PROJECT_ADMIN_REQUIRED:
    "プロジェクト管理者を0人にすることはできません。",
  EMAIL_ALREADY_REGISTERED: "このメールアドレスは既に登録されています。",
  ACCOUNT_ACTION_INVALID:
    "リンクが無効、使用済み、または期限切れです。メールを再発行してください。",
  EMAIL_UNAVAILABLE:
    "メールを送信できませんでした。時間をおいて再度お試しいただくか、運営者にお問い合わせください。",
  RATE_LIMIT_EXCEEDED:
    "送信回数が上限に達しました。時間をおいて再度お試しください。",
  INVALID_CSRF_TOKEN:
    "認証情報の確認に失敗しました。画面を更新して再度お試しください。",
};

export const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: "リクエスト内容を確認してください。",
  401: "ログインが必要です。",
  403: "この操作を行う権限がありません。",
  404: "対象のデータが見つかりません。",
  409: "データの状態が競合しています。内容を確認してください。",
  422: "入力内容を確認してください。",
  429: "送信回数が上限に達しました。時間をおいて再度お試しください。",
  500: "サーバーでエラーが発生しました。時間をおいて再度お試しください。",
  503: "サービスに接続できません。時間をおいて再度お試しください。",
};

export const API_ERROR_FALLBACK_MESSAGES = {
  memberAccountAction:
    "組織内の権限またはユーザーの有効状態が変わったため送信できません。画面を更新して所属状態を確認してください。",
  fileUpload: "ファイルのアップロードに失敗しました。再度お試しください。",
  default: "処理に失敗しました。時間をおいて再度お試しください。",
  request: "APIリクエストに失敗しました。",
  csrfToken: "CSRF token の取得に失敗しました。",
  login: "ログインに失敗しました。時間をおいて再度お試しください。",
  invalidCredentials: "メールアドレスまたはパスワードが正しくありません。",
  avatarUpload: "アイコン画像の更新に失敗しました。",
  avatarDelete: "アイコン画像の削除に失敗しました。",
} as const;

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string = API_ERROR_FALLBACK_MESSAGES.default,
) => {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    if (error.code && API_ERROR_MESSAGES[error.code]) {
      return API_ERROR_MESSAGES[error.code];
    }

    return STATUS_ERROR_MESSAGES[error.status] ?? fallbackMessage;
  }

  return fallbackMessage;
};

export const getLoginApiErrorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
    return API_ERROR_FALLBACK_MESSAGES.invalidCredentials;
  }

  return getApiErrorMessage(error, API_ERROR_FALLBACK_MESSAGES.login);
};
