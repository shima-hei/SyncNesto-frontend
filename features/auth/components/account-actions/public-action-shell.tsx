import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/shared/display/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PublicActionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-svh items-center justify-center bg-muted px-4 py-16 sm:px-6">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login" prefetch={false}>
              ログイン画面へ
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
