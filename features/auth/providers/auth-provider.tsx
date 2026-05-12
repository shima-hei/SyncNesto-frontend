"use client";

import { createContext, useContext } from "react";

import type { UserRead } from "@/lib/api/generated/model";

import { useCurrentUser } from "../hooks/use-current-user";

type AuthContextValue = {
  user: UserRead | null;
  isLoading: boolean;
  isFetching: boolean;
  isAuthenticated: boolean;
  refetchUser: ReturnType<typeof useCurrentUser>["refetchUser"];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isFetching, isAuthenticated, refetchUser } =
    useCurrentUser();

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
