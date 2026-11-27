export type BodyImageKind =
  "document" | "requirement" | "specification" | "task" | "test_design";

export type BodyImageScope = {
  projectId: number;
  kind: BodyImageKind;
};

export const bodyImagePrefix = "/api/body-images/";
const uuid = "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}";
const persisted = new RegExp(`^${bodyImagePrefix}(${uuid})$`);
const pending = new RegExp(
  `!\\[画像をアップロード中\\]\\(${bodyImagePrefix}pending/(${uuid})\\)`,
  "g",
);

export function bodyImageId(src: string) {
  return persisted.exec(src)?.[1];
}

export function pendingBodyImages(value: string) {
  return Array.from(value.matchAll(pending), (match) => ({
    id: match[1],
    marker: match[0],
  }));
}

export function imageMarkdown(alt: string, src: string) {
  const escaped = alt
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/[\\\[\]`*_<>&~!|]/g, "\\$&");
  return `![${escaped}](${src})`;
}

export function pendingImageMarkdown(id: string) {
  return imageMarkdown(
    "画像をアップロード中",
    `${bodyImagePrefix}pending/${id}`,
  );
}
