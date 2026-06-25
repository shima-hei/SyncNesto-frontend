"use client";

import { useRef, useState } from "react";
import {
  Code2Icon,
  EyeIcon,
  Heading2Icon,
  ListIcon,
  PencilIcon,
  TableIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MarkdownTextareaProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function MarkdownTextarea({
  value,
  placeholder,
  onChange,
}: MarkdownTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const insertTemplate = (template: string) => {
    const textarea = textareaRef.current;

    if (!textarea) {
      onChange(`${value}${template}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${template}${value.slice(end)}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + template.length, start + template.length);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertTemplate("\n## 見出し\n\n")}
          >
            <Heading2Icon data-icon="inline-start" />
            見出し
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertTemplate("\n- 項目1\n- 項目2\n")}
          >
            <ListIcon data-icon="inline-start" />
            箇条書き
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              insertTemplate("\n| 項目 | 内容 |\n|---|---|\n|  |  |\n")
            }
          >
            <TableIcon data-icon="inline-start" />
            表
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => insertTemplate("\n```\n\n```\n")}
          >
            <Code2Icon data-icon="inline-start" />
            コード
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "edit" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("edit")}
          >
            <PencilIcon data-icon="inline-start" />
            編集
          </Button>
          <Button
            type="button"
            variant={mode === "preview" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("preview")}
          >
            <EyeIcon data-icon="inline-start" />
            プレビュー
          </Button>
        </div>
      </div>
      {mode === "edit" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          placeholder={placeholder}
          className="min-h-48 font-mono"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <MarkdownPreview value={value} />
      )}
    </div>
  );
}

type MarkdownPreviewProps = {
  value: string;
  emptyMessage?: string;
  className?: string;
};

export function MarkdownPreview({
  value,
  emptyMessage = "プレビューする本文がありません。",
  className,
}: MarkdownPreviewProps) {
  const blocks = createPreviewBlocks(value);

  if (!value.trim()) {
    return (
      <div
        className={cn(
          "min-h-48 rounded-md border bg-muted p-3 text-sm text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-48 flex-col gap-3 rounded-md border bg-background p-3",
        className
      )}
    >
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h4 key={index} className="text-base font-semibold">
              {block.content}
            </h4>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc pl-5 text-sm">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md bg-muted p-3 text-xs"
            >
              {block.content}
            </pre>
          );
        }

        if (block.type === "table") {
          return (
            <div key={index} className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border px-2 py-1">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap text-sm">
            {block.content}
          </p>
        );
      })}
    </div>
  );
}

type PreviewBlock =
  | { type: "heading"; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[] }
  | { type: "code"; content: string }
  | { type: "table"; rows: string[][] };

const createPreviewBlocks = (value: string): PreviewBlock[] => {
  const blocks: PreviewBlock[] = [];
  const lines = value.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];

      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", content: codeLines.join("\n") });
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", content: line.replace(/^##\s+/, "") });
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];

      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].replace(/^-\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];

      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push({
        type: "table",
        rows: tableLines
          .filter((tableLine) => !/^\|?\s*-+/.test(tableLine))
          .map(toTableCells),
      });
      continue;
    }

    blocks.push({ type: "paragraph", content: line });
    index += 1;
  }

  return blocks;
};

const isTableLine = (line: string) => {
  return line.trim().startsWith("|") && line.includes("|");
};

const toTableCells = (line: string) => {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
};
