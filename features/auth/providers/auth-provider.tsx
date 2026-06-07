"use client";

import { createContext, useCallback, useContext } from "react";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
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
  user: CurrentUserRead | null;
  isLoading: boolean;
  isFetching: boolean;
  isAuthenticated: boolean;
  refetchUser: ReturnType<typeof useCurrentUser>["refetchUser"];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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

      if (pathname !== "/login") {
        toast.error(CURRENT_USER_MESSAGES.sessionExpired);
      }

      router.replace("/login");
      router.refresh();
    })();
  }, [pathname, queryClient, router]);

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
