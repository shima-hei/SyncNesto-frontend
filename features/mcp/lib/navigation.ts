// ログイン後の戻り先はMCP同意画面だけを許可する。
export function mcpReturnPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^\/mcp\/authorize\?request_id=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    value,
  )
    ? value
    : undefined;
}

export function mcpPluginInstallUrl(
  value: string | undefined,
): string | undefined {
  if (!value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      url.host === "chatgpt.com" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname !== "/"
    )
      return url.href;
  } catch {
    return undefined;
  }
  return undefined;
}

export function mcpCallbackUrl(value: string, expected: string): string {
  const url = new URL(value);
  const callback = new URL(expected);
  const loopback =
    callback.protocol === "http:" &&
    callback.hostname === "127.0.0.1" &&
    !!callback.port &&
    /^\/callback(?:\/[A-Za-z0-9_-]{1,100})?$/.test(callback.pathname);
  const openai =
    callback.protocol === "https:" &&
    callback.host === "chatgpt.com" &&
    (callback.pathname === "/connector_platform_oauth_redirect" ||
      /^\/connector\/oauth\/[A-Za-z0-9_-]{1,200}$/.test(callback.pathname));
  if (
    !expected ||
    /[\s\\\u0000-\u001f\u007f]/.test(expected + value) ||
    !(loopback || openai) ||
    callback.username ||
    callback.password ||
    callback.search ||
    callback.hash ||
    value.split("?")[0] !== expected ||
    url.username ||
    url.password ||
    url.hash ||
    url.origin !== callback.origin ||
    url.pathname !== callback.pathname
  ) {
    throw new Error(
      "接続先を確認できません。Codexから接続をやり直してください。",
    );
  }
  return url.href;
}
