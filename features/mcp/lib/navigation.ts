// ログイン後の戻り先はMCP同意画面だけを許可する。
export function mcpReturnPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^\/mcp\/authorize\?request_id=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    value,
  )
    ? value
    : undefined;
}

export function mcpCallbackUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !/^\/callback(?:\/[A-Za-z0-9_-]{1,100})?$/.test(url.pathname)
  ) {
    throw new Error(
      "接続先を確認できません。Codexから接続をやり直してください。",
    );
  }
  return url.href;
}
