"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CURRENT_USER_MESSAGES } from "../../constants/current-user-messages";

type LoginSessionToastProps = {
  showSessionExpiredToast: boolean;
};

export function LoginSessionToast({
  showSessionExpiredToast,
}: LoginSessionToastProps) {
  const router = useRouter();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!showSessionExpiredToast || hasShownToast.current) {
      return;
    }

    hasShownToast.current = true;
    toast.error(CURRENT_USER_MESSAGES.sessionExpired);
    const url = new URL(window.location.href);
    url.searchParams.delete("reason");
    router.replace(url.pathname + url.search + url.hash, { scroll: false });
  }, [router, showSessionExpiredToast]);

  return null;
}
