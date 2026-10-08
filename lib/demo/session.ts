import type { CurrentUserRead, DemoStatus } from "@/lib/api/generated/model";

let active: DemoStatus | null = null;
let activeUserId: number | null = null;
let generation = 0;
let identity: string | null = null;
const drafts = new Map<string, unknown>();
const CHANNEL = "syncnesto:demo-ended";

/** デモの下書きはメモリにだけ保持し、ブラウザの永続領域へ書かない。 */
export function registerDemoUser(user: CurrentUserRead) {
  const nextIdentity = user.demo
    ? `demo:${user.demo.id}:${user.id}`
    : `normal:${user.id}`;
  if (identity !== nextIdentity) generation++;
  identity = nextIdentity;
  if (user.demo) {
    registerDemoStatus(user.demo);
    activeUserId = user.id;
  } else {
    active = null;
    activeUserId = null;
    drafts.clear();
  }
}

export function registerDemoStatus(demo: DemoStatus) {
  if (active?.id !== demo.id) {
    drafts.clear();
    activeUserId = null;
  }
  active = demo;
}

export const getDraftSession = (userId: number) => {
  if (!identity?.endsWith(`:${userId}`)) return null;
  if (
    identity.startsWith("demo:") &&
    (!active ||
      activeUserId !== userId ||
      identity !== `demo:${active.id}:${userId}` ||
      Date.parse(active.expires_at) <= Date.now())
  )
    return null;
  return `${identity}:${generation}`;
};
export const getClientDataRealm = () =>
  identity ? (identity.startsWith("demo:") ? "demo" : "normal") : null;
export const isCurrentDraftSession = (userId: number, session: string | null) =>
  session !== null && session === getDraftSession(userId);
export const isDemoUser = (userId: number) =>
  identity?.startsWith("demo:") === true && identity.endsWith(`:${userId}`);
export const isActiveDemoUser = (userId: number) =>
  activeUserId === userId && Boolean(active);
const acceptsKey = (key: string) =>
  !key.startsWith("demo:") || key.startsWith(`demo:${active?.id}:`);
export const getDemoId = () => active?.id ?? null;
export const readDemoDraft = <T>(key: string): T | null =>
  active && acceptsKey(key) && Date.parse(active.expires_at) > Date.now()
    ? ((drafts.get(`${active.id}:${key}`) as T | undefined) ?? null)
    : null;
export const writeDemoDraft = (key: string, value: unknown) => {
  if (active && acceptsKey(key) && Date.parse(active.expires_at) > Date.now())
    drafts.set(`${active.id}:${key}`, value);
};
export const removeDemoDraft = (key: string) => {
  if (active) drafts.delete(`${active.id}:${key}`);
};

export function clearDemoData(broadcast = true) {
  const demoId = active?.id;
  active = null;
  activeUserId = null;
  identity = null;
  generation++;
  drafts.clear();
  if (demoId && broadcast && typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ id: demoId });
    channel.close();
  }
}

export function subscribeDemoEnded(onEnd: () => void) {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event: MessageEvent<{ id: string }>) => {
    if (event.data?.id === active?.id) {
      clearDemoData(false);
      onEnd();
    }
  };
  return () => channel.close();
}
