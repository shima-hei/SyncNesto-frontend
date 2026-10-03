"use client";

import {
  Activity,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { XIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const subscribe = (notify: () => void) => {
  const media = window.matchMedia("(max-width: 1199px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const snapshot = () => window.matchMedia("(max-width: 1199px)").matches;
const serverSnapshot = () => false;

export function DesignInspector({
  active,
  onClose,
  onChange,
  children,
}: {
  active: "patterns" | "comments" | "requirements" | null;
  onClose: () => void;
  onChange: (value: "patterns" | "comments" | "requirements") => void;
  children: ReactNode;
}) {
  const overlay = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const opener = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active || overlay) return;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && panel.current?.contains(focused))
      return;
    if (focused instanceof HTMLElement) opener.current = focused;
    const frame = requestAnimationFrame(() =>
      panel.current
        ?.querySelector<HTMLButtonElement>(
          'button[aria-label="Inspectorを閉じる"]',
        )
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [active, overlay]);
  const title =
    active === "patterns"
      ? "パターン"
      : active === "comments"
        ? "コメント"
        : "関連要件";
  const navigation = (
    <Tabs
      value={active ?? "patterns"}
      onValueChange={(value) =>
        onChange(value as "patterns" | "comments" | "requirements")
      }
    >
      <TabsList variant="line" aria-label="Inspectorの種類">
        <TabsTrigger value="patterns">パターン</TabsTrigger>
        <TabsTrigger value="comments">コメント</TabsTrigger>
        <TabsTrigger value="requirements">関連要件</TabsTrigger>
      </TabsList>
    </Tabs>
  );
  const close = () => {
    onClose();
    requestAnimationFrame(() =>
      (opener.current?.isConnected
        ? opener.current
        : document.querySelector<HTMLElement>(
            '[role="grid"][aria-label="itemsの表"]',
          )
      )?.focus({ preventScroll: true }),
    );
  };
  if (overlay)
    return (
      <Activity mode={active ? "visible" : "hidden"}>
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        >
          <SheetContent
            className="data-[side=right]:w-[min(640px,95vw)] data-[side=right]:sm:max-w-none"
            onOpenAutoFocus={() => {
              opener.current = document.activeElement as HTMLElement;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
          >
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>
                選択した対象の情報を確認・編集します。
              </SheetDescription>
            </SheetHeader>
            <div className="px-4">{navigation}</div>
            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
              {children}
            </div>
          </SheetContent>
        </Sheet>
      </Activity>
    );
  return (
    <aside
      ref={panel}
      aria-label={title}
      hidden={!active}
      className="sticky top-2 ml-3 max-h-[calc(100dvh-5rem)] w-[min(42vw,640px)] shrink-0 overflow-auto border-l pl-3"
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          !event.nativeEvent.isComposing
        ) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <div className="sticky top-0 z-30 mb-3 flex items-center justify-between border-b bg-background pb-2">
        {navigation}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Inspectorを閉じる"
          onClick={close}
        >
          <XIcon />
        </Button>
      </div>
      {children}
    </aside>
  );
}
