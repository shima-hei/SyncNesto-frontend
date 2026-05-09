export type ApiErrorResponse = {
  message: string;
  code: string;
};

export type ApiValidationErrorResponse = {
  detail?: Array<{
    loc?: Array<string | number>;
    msg?: string;
    type?: string;
  }>;
};
