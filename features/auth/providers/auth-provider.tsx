"use client";

import { createContext, useCallback, useContext } from "react";
import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/error";
import type { CurrentUserRead } from "@/lib/api/generated/model";
import {
  isAuthSessionInvalidCode,
  subscribeAuthSessionInvalid,
} from "@/lib/auth/session-events";

import { useCurrentUser } from "../hooks/use-current-user";
import {
  cancelCurrentUserQuery,
  setCurrentUserCache,
} from "../lib/current-user-cache";
import { CURRENT_USER_MESSAGES } from "../constants/current-user-messages";

type AuthContextValue = {
  authQueryClient: QueryClient;
  user: CurrentUserRead | null;
  isLoading: boolean;
  isFetching: boolean;
  isAuthenticated: boolean;
  refetchUser: ReturnType<typeof useCurrentUser>["refetchUser"];
};

const AuthContext = createContext<AuthContextValue | null>(null);
const PUBLIC_AUTH_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/confirm-email-change",
]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isHandlingSessionInvalid = useRef(false);
  const { user, isLoading, isFetching, isAuthenticated, error, refetchUser } =
    useCurrentUser();

  const handleSessionInvalid = useCallback(() => {
    isHandlingSessionInvalid.current = true;

    void (async () => {
      await cancelCurrentUserQuery(queryClient);
      setCurrentUserCache(queryClient, null);

      if (PUBLIC_AUTH_PATHS.has(pathname)) return;

      toast.error(CURRENT_USER_MESSAGES.sessionExpired);

      queryClient.clear();
      window.location.replace("/login?reason=session-expired");
    })();
  }, [pathname, queryClient]);

  useEffect(() => {
    const revalidateRestoredPage = (event: PageTransitionEvent) => {
      if (event.persisted && !PUBLIC_AUTH_PATHS.has(window.location.pathname))
        window.location.reload();
    };
    window.addEventListener("pageshow", revalidateRestoredPage);
    return () => window.removeEventListener("pageshow", revalidateRestoredPage);
  }, []);

  useEffect(() => {
    if (user) {
      isHandlingSessionInvalid.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (
      error instanceof ApiError &&
      isAuthSessionInvalidCode(error.code) &&
      !isHandlingSessionInvalid.current
    ) {
      handleSessionInvalid();
    }
  }, [error, handleSessionInvalid]);

  useEffect(() => {
    return subscribeAuthSessionInvalid(() => {
      if (isHandlingSessionInvalid.current) {
        return;
      }

      handleSessionInvalid();
    });
  }, [handleSessionInvalid]);

  return (
    <AuthContext.Provider
      value={{
        authQueryClient: queryClient,
        user,
        isLoading,
        isFetching,
        isAuthenticated,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

/** Identityのキャッシュは組織ごとの業務キャッシュから独立して共有する。 */
export function useAuthQueryClient() {
  return useAuth().authQueryClient;
}
