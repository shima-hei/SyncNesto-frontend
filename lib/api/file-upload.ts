import type { FileUploadPlan } from "@/lib/api/generated/model/fileUploadPlan";
import type { FileUploadRequest } from "@/lib/api/generated/model/fileUploadRequest";
import { API_ERROR_FALLBACK_MESSAGES } from "@/lib/messages/api-error-message";

export function fileUploadMetadata(
  file: Blob,
  filename: string,
): FileUploadRequest {
  return { filename, content_type: file.type, byte_size: file.size };
}

export async function uploadWithPlan<T>(
  file: Blob,
  plan: FileUploadPlan,
  uploadThroughServer: () => Promise<T>,
  completeUpload: (token: string) => Promise<T>,
): Promise<T> {
  if (plan.mode === "server") {
    return uploadThroughServer();
  }
  if (!plan.url || !plan.upload_token) {
    throw new Error(API_ERROR_FALLBACK_MESSAGES.fileUpload);
  }
  const response = await fetch(plan.url, {
    method: "PUT",
    headers: plan.headers,
    body: file,
    credentials: "omit",
  });
  if (!response.ok) {
    throw new Error(API_ERROR_FALLBACK_MESSAGES.fileUpload);
  }
  return completeUpload(plan.upload_token);
}
