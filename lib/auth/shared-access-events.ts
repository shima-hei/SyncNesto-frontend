const CHANNEL = "syncnesto-shared-auth-change";
export const SHARED_AUTH_EVENT = "syncnesto:shared-auth-change";
export const SHARED_AUTH_STORAGE_KEY = "syncnesto-shared-auth-nonce";

export function announceSharedAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SHARED_AUTH_EVENT));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage("changed");
    channel.close();
  }
  try {
    // 本文・本人情報・tokenを保存せず、別tabへの再認可通知だけを送る。
    window.localStorage.setItem(SHARED_AUTH_STORAGE_KEY, crypto.randomUUID());
  } catch {
    // 保存できなくてもfocus/pageshowで必ず再認可する。
  }
}

export function sharedAuthChannel() {
  return typeof BroadcastChannel === "undefined"
    ? null
    : new BroadcastChannel(CHANNEL);
}
