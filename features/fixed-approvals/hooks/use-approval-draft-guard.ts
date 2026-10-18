"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useApprovalDraftGuard(dirty: boolean) {
  const router = useRouter();
  const saved = useRef(false);
  const [destination, setDestination] = useState<URL | null>(null);
  const markSaved = useCallback(() => {
    saved.current = true;
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      if (!saved.current) event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      if (
        saved.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        !(event.target instanceof Element)
      )
        return;
      const anchor = event.target.closest("a");
      if (
        !anchor ||
        anchor.download ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const next = new URL(anchor.href);
      if (next.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(next);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  return {
    markSaved,
    dialogProps: {
      open: destination !== null,
      onOpenChange: (open: boolean) => {
        if (!open) setDestination(null);
      },
      title: "入力中の内容があります",
      description:
        "例外理由や判断メモをまだ保存していません。移動すると入力が失われます。",
      confirmLabel: "入力を破棄して移動",
      cancelLabel: "入力を続ける",
      destructive: true,
      onConfirm: () => {
        if (!destination) return;
        saved.current = true;
        if (destination.origin === window.location.origin)
          router.push(
            destination.pathname + destination.search + destination.hash,
          );
        else window.location.assign(destination.href);
        setDestination(null);
      },
    },
  };
}
