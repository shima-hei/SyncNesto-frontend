"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type WireframeArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function readWireframeArea(path?: string | null) {
  const match = path?.match(
    /^content\/artboards\/([^/]+)\/area\/([0-9]{1,4})\/([0-9]{1,4})\/([0-9]{1,4})\/([0-9]{1,4})$/,
  );
  if (!match) return;
  const [, boardId, x, y, width, height] = match;
  return {
    boardId,
    x: Number(x),
    y: Number(y),
    width: Number(width),
    height: Number(height),
  };
}

export function WireframeReviewArea({
  area,
  selecting,
  onChange,
  width,
  height,
}: {
  area?: WireframeArea;
  selecting: boolean;
  onChange: (area: WireframeArea) => void;
  width: number;
  height: number;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const marker = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selecting)
      marker.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [area, selecting]);
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(
        width - 1,
        Math.max(
          0,
          Math.round(((event.clientX - box.left) / box.width) * width),
        ),
      ),
      y: Math.min(
        height - 1,
        Math.max(
          0,
          Math.round(((event.clientY - box.top) / box.height) * height),
        ),
      ),
    };
  };
  const update = (event: PointerEvent<HTMLDivElement>) => {
    const begin = start.current;
    if (!begin) return;
    const end = point(event);
    onChange({
      x: Math.min(begin.x, end.x),
      y: Math.min(begin.y, end.y),
      width: Math.max(1, Math.abs(end.x - begin.x)),
      height: Math.max(1, Math.abs(end.y - begin.y)),
    });
  };
  return (
    <>
      {selecting && (
        <div
          aria-label="指摘する範囲を選択するキャンバス"
          className="absolute inset-0 z-20 cursor-crosshair touch-none"
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            start.current = point(event);
            event.currentTarget.setPointerCapture(event.pointerId);
            update(event);
          }}
          onPointerMove={update}
          onPointerUp={(event) => {
            update(event);
            start.current = null;
          }}
          onLostPointerCapture={() => {
            start.current = null;
          }}
        />
      )}
      {area && (
        <div
          ref={marker}
          role="img"
          aria-label="レビュー指摘の対象範囲"
          className="pointer-events-none absolute z-30 border-2 border-sky-700 bg-sky-400/15"
          style={{
            left: area.x,
            top: area.y,
            width: area.width,
            height: area.height,
          }}
        />
      )}
    </>
  );
}

export function WireframeAreaFields({
  area,
  width,
  height,
  onChange,
  onReview,
}: {
  area: WireframeArea;
  width: number;
  height: number;
  onChange: (area: WireframeArea) => void;
  onReview: () => void;
}) {
  const bounds = {
    x: [0, width - area.width],
    y: [0, height - area.height],
    width: [1, width - area.x],
    height: [1, height - area.y],
  };
  const labels = { x: "X", y: "Y", width: "幅", height: "高さ" };
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-2">
      {(["x", "y", "width", "height"] as const).map((key) => (
        <label key={key} className="flex flex-col gap-1 text-xs">
          範囲の{labels[key]}
          <Input
            className="h-8 w-24"
            type="number"
            min={bounds[key][0]}
            max={bounds[key][1]}
            value={area[key]}
            onChange={(event) => {
              const number = event.target.valueAsNumber;
              if (!Number.isFinite(number)) return;
              onChange({
                ...area,
                [key]: Math.max(
                  bounds[key][0],
                  Math.min(bounds[key][1], Math.round(number)),
                ),
              });
            }}
          />
        </label>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={onReview}>
        選択範囲に指摘
      </Button>
    </div>
  );
}
