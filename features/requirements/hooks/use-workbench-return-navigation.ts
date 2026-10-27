"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { useWorkbenchScope } from "./use-workbench-state";
import { workbenchState } from "../lib/workbench-state";

type ReturnPoint = {
  path: string;
  x: number;
  y: number;
  row?: { id: string; top: number };
  panelTop: number;
  input?: { id: string; start: number; end: number; top: number };
};

export function captureWorkbenchReturnPoint(
  node: HTMLElement | null,
  identity: string,
  scope: string,
  trigger?: Element,
) {
  if (!node || !scope) return;
  const selected = new URLSearchParams(window.location.search).get(
    "selectedRequirement",
  );
  const row =
    trigger?.closest<HTMLElement>("[data-workbench-requirement-id]") ??
    (selected
      ? node.querySelector<HTMLElement>(
          `[data-workbench-requirement-id="${CSS.escape(selected)}"]`,
        )
      : null);
  const input = node.querySelector<HTMLTextAreaElement>(
    'textarea[id^="section-body-"]',
  );
  const point: ReturnPoint = {
    path: window.location.pathname,
    x: window.scrollX,
    y: window.scrollY,
    row: row
      ? {
          id: row.dataset.workbenchRequirementId!,
          top: row.getBoundingClientRect().top,
        }
      : undefined,
    panelTop:
      node.querySelector("[data-workbench-support-panel]")?.scrollTop ?? 0,
    input: input
      ? {
          id: input.id,
          start: input.selectionStart,
          end: input.selectionEnd,
          top: input.scrollTop,
        }
      : undefined,
  };
  workbenchState.write(identity, scope, "return-point", point);
}

export function useWorkbenchReturnNavigation(
  root: RefObject<HTMLDivElement | null>,
  activeTab: string,
) {
  const context = useWorkbenchScope();
  const identity = context?.identity ?? "";
  const scope = context?.scope ?? "";
  const [notice, setNotice] = useState("");
  useLayoutEffect(() => {
    if (!scope || activeTab !== "requirements") return;
    const capture = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const element = event.target instanceof Element ? event.target : null;
      const link = element?.closest<HTMLAnchorElement>("a[href]");
      if (!link || !root.current?.contains(link) || link.target === "_blank")
        return;
      const target = new URL(link.href);
      if (
        target.origin !== window.location.origin ||
        !target.pathname.startsWith(`${window.location.pathname}/items/`)
      )
        return;
      captureWorkbenchReturnPoint(root.current, identity, scope, link);
    };
    document.addEventListener("click", capture, true);
    return () => document.removeEventListener("click", capture, true);
  }, [identity, scope, activeTab, root]);

  useLayoutEffect(() => {
    if (!scope || activeTab !== "requirements") return;
    const point = workbenchState.read<ReturnPoint>(
      identity,
      scope,
      "return-point",
    );
    if (!point || point.path !== window.location.pathname) return;
    let frame = 0;
    let finished = false;
    const restore = (fallback = false) => {
      const node = root.current;
      if (!node || finished) return;
      const row = point.row
        ? node.querySelector<HTMLElement>(
            `[data-workbench-requirement-id="${CSS.escape(point.row.id)}"]`,
          )
        : null;
      const input = point.input
        ? document.getElementById(point.input.id)
        : null;
      if (
        !fallback &&
        ((point.row && !row) ||
          (point.input && !(input instanceof HTMLTextAreaElement)))
      )
        return;
      if (
        !fallback &&
        !node.querySelector('[data-workbench-list-ready="true"]')
      )
        return;
      finished = true;
      observer.disconnect();
      clearTimeout(timer);
      if (input instanceof HTMLTextAreaElement && point.input) {
        input.focus({ preventScroll: true });
        input.setSelectionRange(point.input.start, point.input.end);
        input.scrollTop = point.input.top;
      }
      const panel = node.querySelector<HTMLElement>(
        "[data-workbench-support-panel]",
      );
      if (panel) panel.scrollTop = point.panelTop;
      window.scrollTo(
        point.x,
        row && point.row
          ? window.scrollY + row.getBoundingClientRect().top - point.row.top
          : point.y,
      );
      if (
        (point.row && !row) ||
        (point.input && !(input instanceof HTMLTextAreaElement))
      ) {
        setNotice(
          "戻り先が削除・移動または絞り込み対象外のため、選択と絞り込みを保持して元の一覧位置へ戻りました。",
        );
      }
      workbenchState.remove(identity, scope, "return-point");
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => restore());
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(() => restore(true), 10_000);
    schedule();
    return () => {
      finished = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [identity, scope, activeTab, root]);
  return notice;
}
