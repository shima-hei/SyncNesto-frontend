export const AUTH_ERROR_CODES = {
  authenticationRequired: "AUTHENTICATION_REQUIRED",
  invalidCredentials: "INVALID_CREDENTIALS",
  invalidToken: "INVALID_TOKEN",
  tokenExpired: "TOKEN_EXPIRED",
} as const;

type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

type AuthSessionInvalidDetail = {
  code: AuthErrorCode;
};

const AUTH_SESSION_INVALID_EVENT = "syncnesto:auth-session-invalid";

export const isAuthSessionInvalidCode = (
  code: string | undefined
): code is typeof AUTH_ERROR_CODES.invalidToken | typeof AUTH_ERROR_CODES.tokenExpired => {
  return (
    code === AUTH_ERROR_CODES.invalidToken ||
    code === AUTH_ERROR_CODES.tokenExpired
  );
};

export const emitAuthSessionInvalid = (detail: AuthSessionInvalidDetail) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AuthSessionInvalidDetail>(AUTH_SESSION_INVALID_EVENT, {
      detail,
    })
  );
};

export const subscribeAuthSessionInvalid = (
  handler: (detail: AuthSessionInvalidDetail) => void
) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    handler((event as CustomEvent<AuthSessionInvalidDetail>).detail);
  };

  window.addEventListener(AUTH_SESSION_INVALID_EVENT, listener);

  return () => {
    window.removeEventListener(AUTH_SESSION_INVALID_EVENT, listener);
  };
};
