"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { subscribeAuthSessionInvalid } from "@/lib/auth/session-events";
import {
  sharedAuthChannel,
  SHARED_AUTH_EVENT,
  SHARED_AUTH_STORAGE_KEY,
} from "@/lib/auth/shared-access-events";

export function useFreshShared<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  setMasked: (hidden: boolean) => void,
) {
  const { user, refetchUser } = useAuth();
  const controller = useRef<AbortController | null>(null);
  const ticket = useRef(0);
  const [state, setState] = useState<{
    key: string;
    value?: T;
    operationSignal?: AbortSignal;
    error?: unknown;
  }>({ key });
  const mask = useCallback(() => {
    ticket.current += 1;
    controller.current?.abort();
    setMasked(true);
    setState({ key });
  }, [key, setMasked]);
  const refresh = useCallback(async () => {
    mask();
    if (document.visibilityState === "hidden") return;
    const current = ticket.current;
    const active = new AbortController();
    controller.current = active;
    try {
      const auth = await refetchUser();
      if (!auth.data || auth.error)
        throw auth.error ?? new Error("ログインを確認してください");
      if (active.signal.aborted || current !== ticket.current) return;
      const value = await load(active.signal);
      if (!active.signal.aborted && current === ticket.current)
        setState({ key, value, operationSignal: active.signal });
    } catch (error) {
      if (!active.signal.aborted && current === ticket.current)
        setState({ key, error });
    }
  }, [key, load, mask, refetchUser]);
  useLayoutEffect(() => {
    setMasked(false);
  }, [state, setMasked]);
  useEffect(() => {
    const request = () => {
      void refresh();
    };
    const visible = () =>
      document.visibilityState === "hidden" ? mask() : request();
    const storage = (event: StorageEvent) => {
      if (event.key === SHARED_AUTH_STORAGE_KEY) request();
    };
    const channel = sharedAuthChannel();
    if (channel) channel.onmessage = request;
    const unsubscribe = subscribeAuthSessionInvalid(mask);
    window.addEventListener("focus", request);
    window.addEventListener("pageshow", request);
    window.addEventListener("pagehide", mask);
    window.addEventListener("offline", mask);
    window.addEventListener("online", request);
    window.addEventListener("storage", storage);
    window.addEventListener(SHARED_AUTH_EVENT, request);
    document.addEventListener("visibilitychange", visible);
    request();
    return () => {
      ticket.current += 1;
      controller.current?.abort();
      channel?.close();
      unsubscribe();
      window.removeEventListener("focus", request);
      window.removeEventListener("pageshow", request);
      window.removeEventListener("pagehide", mask);
      window.removeEventListener("offline", mask);
      window.removeEventListener("online", request);
      window.removeEventListener("storage", storage);
      window.removeEventListener(SHARED_AUTH_EVENT, request);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [mask, refresh, user?.id]);
  return {
    value: state.key === key ? state.value : undefined,
    error: state.key === key ? state.error : undefined,
    refresh,
    operationSignal: state.key === key ? state.operationSignal : undefined,
  };
}
