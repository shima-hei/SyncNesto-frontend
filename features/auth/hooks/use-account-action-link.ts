"use client";

import { useEffect, useRef, useState } from "react";
import {
  accountActionApi,
  type AccountActionInspection,
} from "../lib/account-action-api";

export function useAccountActionLink() {
  const token = useRef<string | null | undefined>(undefined);
  const generation = useRef(0);
  const [state, setState] = useState<{
    inspection: AccountActionInspection | null;
    error: Error | null;
    revision: number;
  }>({ inspection: null, error: null, revision: 0 });
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const inspectLink = async (newFragment: boolean) => {
      if (newFragment || token.current === undefined) {
        const url = new URL(window.location.href);
        token.current = new URLSearchParams(url.hash.slice(1)).get("token");
        url.hash = "";
        window.history.replaceState(window.history.state, "", url);
      }
      const revision = ++generation.current;
      controller?.abort();
      controller = new AbortController();
      const request = controller;
      const currentToken = token.current;
      // 同じURLの別リンクでもフォームと確認ステップを取り直す。
      await Promise.resolve();
      if (!active || generation.current !== revision) return;
      setState({ inspection: null, error: null, revision });
      try {
        if (!currentToken)
          throw new Error(
            "メール内のリンクを開いてください。リンクがない場合は再発行してください。",
          );
        // トークンはURL・永続ストレージ・QueryClientへ保存しない。
        const inspection = await accountActionApi.inspect(
          { token: currentToken },
          { signal: request.signal },
        );
        if (active && generation.current === revision)
          setState({ inspection, error: null, revision });
      } catch (cause) {
        if (active && generation.current === revision)
          setState({
            inspection: null,
            error:
              cause instanceof Error
                ? cause
                : new Error("リンクを確認できませんでした。"),
            revision,
          });
      }
    };
    const onHashChange = () => {
      if (window.location.hash) void inspectLink(true);
    };
    window.addEventListener("hashchange", onHashChange);
    void inspectLink(false);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
  return {
    getToken: () =>
      generation.current === state.revision ? (token.current ?? null) : null,
    clearToken: () => {
      if (generation.current === state.revision) token.current = null;
    },
    ...state,
    isPending: !state.inspection && !state.error,
  };
}
