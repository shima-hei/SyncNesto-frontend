export type ApiErrorResponse = {
  message: string;
  code: string;
};

export type ApiConflictErrorResponse<TCurrent = unknown> = {
  message: string;
  code: "VERSION_CONFLICT";
  current: TCurrent;
};

export type ApiValidationErrorResponse = {
  detail?: Array<{
    loc?: Array<string | number>;
    msg?: string;
    type?: string;
  }>;
};
