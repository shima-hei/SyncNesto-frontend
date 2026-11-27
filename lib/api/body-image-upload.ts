import { apiClient } from "@/lib/api/client";
import { fileUploadMetadata, uploadWithPlan } from "@/lib/api/file-upload";
import type {
  CommentImageRead,
  FileUploadPlan,
} from "@/lib/api/generated/model";

export function discardBodyImage(path: string, imageId: string) {
  void apiClient(`${path}/${imageId}`, { method: "DELETE" }).catch(() => {});
}

export async function uploadBodyImage(file: File, path: string) {
  const filename = file.name || "image.png";
  const plan = await apiClient<FileUploadPlan>(`${path}/upload-plan`, {
    method: "POST",
    body: JSON.stringify(fileUploadMetadata(file, filename)),
  });
  return uploadWithPlan(
    file,
    plan,
    () => {
      const form = new FormData();
      form.append("file", file, filename);
      return apiClient<CommentImageRead>(`${path}/upload`, {
        method: "POST",
        body: form,
      });
    },
    (token) =>
      apiClient<CommentImageRead>(`${path}/upload-complete`, {
        method: "POST",
        body: JSON.stringify({ upload_token: token }),
      }),
  );
}
