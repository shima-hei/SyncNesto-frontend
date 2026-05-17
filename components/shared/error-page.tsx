import Link from "next/link";

import { Button } from "@/components/ui/button";

import { BackButton } from "./back-button";

type ErrorPageProps = {
  statusCode: string;
  title: string;
  description: string;
};

export function ErrorPage({
  statusCode,
  title,
  description,
}: ErrorPageProps) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <section className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {statusCode}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <BackButton />
          <Button asChild>
            <Link href="/">ホームへ戻る</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
