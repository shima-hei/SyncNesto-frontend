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
    router.replace("/login", { scroll: false });
  }, [router, showSessionExpiredToast]);

  return null;
}
