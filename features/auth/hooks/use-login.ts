"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LoginFormValues } from "../types/login";

export function useLogin() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(values: LoginFormValues) {
    setIsPending(true);
    setError(null);

    try {
      // TODO: Replace this with the real authentication API.
      console.log(values);
      router.push("/");
    } catch {
      setError("ログインに失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsPending(false);
    }
  }

  return {
    login,
    isPending,
    error,
  };
}
