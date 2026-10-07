"use client";

import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/providers/auth-provider";
import {
  demoStatusDemoStatusGet,
  resetDemoDemoResetPost,
} from "@/lib/api/generated/demo/demo";
import { clearDemoData } from "@/lib/demo/session";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import type { DemoStatus } from "@/lib/api/generated/model";

export function DemoBanner() {
  const { user } = useAuth();
  if (!user?.demo) return null;
  return <ActiveDemo initial={user.demo} />;
}

function ActiveDemo({ initial }: { initial: DemoStatus }) {
  const status = useQuery({
    queryKey: ["demo-status", initial.id],
    queryFn: ({ signal }) =>
      demoStatusDemoStatusGet({
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      }),
    initialData: initial,
    retry: false,
    refetchInterval: 30_000,
  });
  const reset = useMutation({
    mutationFn: () => resetDemoDemoResetPost(),
    onSuccess: () => {
      clearDemoData();
      window.location.replace("/");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const { refetch, data } = status;
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        void refetch().then((result) => {
          if (result.isError) {
            clearDemoData();
            window.location.replace("/login?reason=session-expired");
          }
        }),
      Math.max(0, Date.parse(data.expires_at) - Date.now()) + 1000,
    );
    return () => window.clearTimeout(timer);
  }, [data.expires_at, refetch]);
  return (
    <aside
      aria-label="デモの利用案内"
      className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted px-4 py-3"
    >
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">DEMO</Badge>
          <span>あなた専用の体験環境</span>
        </div>
        <p className="text-muted-foreground">
          入力内容は終了時に破棄されます。無操作15分・開始から最大60分。メールは送信しません。
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={reset.isPending}>
            最初からやり直す
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>デモを最初からやり直しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在の入力内容を破棄して、新しい体験環境を開きます。他のタブにも反映されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => reset.mutate()}>
              やり直す
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
