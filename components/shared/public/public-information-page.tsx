import type { ReactNode } from "react";
import Link from "next/link";

import { ThemeSwitcher } from "@/components/shared/display/theme-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const PUBLIC_INFORMATION_LINKS = [
  { href: "/support", label: "お問い合わせ" },
  { href: "/privacy", label: "プライバシー" },
  { href: "/terms", label: "利用規約" },
] as const;

export function PublicInformationLinks() {
  return (
    <nav
      aria-label="サービスについて"
      className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
    >
      {PUBLIC_INFORMATION_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function PublicInformationPage({
  path,
  title,
  description,
  children,
}: {
  path: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6">
        <Link
          href="/login"
          prefetch={false}
          className="font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Syncnesto
        </Link>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button asChild variant="outline" size="sm">
            <Link href="/login" prefetch={false}>
              ログイン
            </Link>
          </Button>
        </div>
      </header>
      <Separator />
      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-12">
        <nav
          aria-label="公開情報"
          className="flex flex-wrap gap-1 self-start md:sticky md:top-6 md:flex-col"
        >
          {PUBLIC_INFORMATION_LINKS.map(({ href, label }) => (
            <Button
              key={href}
              asChild
              size="sm"
              variant={path === href ? "secondary" : "ghost"}
              className="justify-start"
            >
              <Link
                href={href}
                prefetch={false}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            </Button>
          ))}
        </nav>
        <main id="main-content" className="min-w-0">
          <div className="flex flex-col gap-8">
            <header className="flex flex-col gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </header>
            <div className="flex flex-col gap-8 text-sm leading-7 [&_a]:break-words [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-ring [&_ul]:list-disc [&_ul]:pl-5">
              {children}
            </div>
            <Separator />
            <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>運営者: shime-hei</span>
              <span>制定・更新日: 2026年10月13日</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export function PublicInformationSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
