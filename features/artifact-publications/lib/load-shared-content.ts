import { readShared, readSharedFiles, readSharedNodes } from "./access-api";
import type { PublicationNodeRead } from "@/lib/api/generated/model";

export async function loadSharedContent(identity: string, signal: AbortSignal) {
  const metadata = await readShared(identity, { signal });
  const nodes: PublicationNodeRead[] = [];
  let cursor: string | undefined;
  do {
    const page = await readSharedNodes(
      identity,
      { page_size: 100, cursor },
      { signal },
    );
    if (
      page.authorization_revision !== metadata.authorization_revision ||
      page.total !== metadata.content.node_count
    )
      throw new Error("公開許可が変わりました");
    nodes.push(...page.items);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  if (
    nodes.length !== metadata.content.node_count ||
    nodes.some((node, index) => node.ordinal !== index)
  )
    throw new Error("本文全体を取得できませんでした");
  const [files, latest] = await Promise.all([
    readSharedFiles(identity, { signal }),
    readShared(identity, { signal }),
  ]);
  if (
    files.authorization_revision !== metadata.authorization_revision ||
    latest.authorization_revision !== metadata.authorization_revision ||
    JSON.stringify(files.items) !== JSON.stringify(metadata.content.files)
  )
    throw new Error("公開許可が変わりました");
  return { metadata, nodes };
}
