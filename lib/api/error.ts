export class ApiError extends Error {
  status: number;
  code?: string;
  data: unknown;

  constructor({
    status,
    message,
    code,
    data,
  }: {
    status: number;
    message: string;
    code?: string;
    data?: unknown;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}
