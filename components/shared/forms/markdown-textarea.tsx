"use client";

import {
  Children,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  BoldIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  Code2Icon,
  EyeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PencilIcon,
  QuoteIcon,
  TableIcon,
  WorkflowIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const insertTemplate = (template: string, cursorOffset = template.length) => {
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
      const cursorPosition = start + cursorOffset;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <MarkdownToolbarMenu
            label="見出し"
            icon={<Heading2Icon data-icon="inline-start" />}
            items={[
              {
                label: "大見出し",
                icon: <Heading1Icon />,
                template: "\n# 見出し1\n\n",
              },
              {
                label: "中見出し",
                icon: <Heading2Icon />,
                template: "\n## 見出し2\n\n",
              },
              {
                label: "小見出し",
                icon: <Heading3Icon />,
                template: "\n### 見出し3\n\n",
              },
            ]}
            onSelect={insertTemplate}
          />
          <MarkdownToolbarMenu
            label="装飾"
            icon={<BoldIcon data-icon="inline-start" />}
            items={[
              {
                label: "太字",
                icon: <BoldIcon />,
                template: "**強調**",
                cursorOffset: 2,
              },
              {
                label: "斜体",
                icon: <ItalicIcon />,
                template: "*斜体*",
                cursorOffset: 1,
              },
              {
                label: "リンク",
                icon: <LinkIcon />,
                template: "[リンク](https://example.com)",
                cursorOffset: 1,
              },
              {
                label: "引用",
                icon: <QuoteIcon />,
                template: "\n> 引用\n\n",
              },
            ]}
            onSelect={insertTemplate}
          />
          <MarkdownToolbarMenu
            label="挿入"
            icon={<TableIcon data-icon="inline-start" />}
            items={[
              {
                label: "区切り線",
                icon: <MinusIcon />,
                template: "\n---\n\n",
              },
              {
                label: "箇条書き",
                icon: <ListIcon />,
                template: "\n- 項目1\n- 項目2\n",
              },
              {
                label: "番号付きリスト",
                icon: <ListOrderedIcon />,
                template: "\n1. 項目1\n2. 項目2\n",
              },
              {
                label: "チェックリスト",
                icon: <CheckSquareIcon />,
                template: "\n- [ ] 未完了\n- [x] 完了\n",
              },
              {
                label: "表",
                icon: <TableIcon />,
                template: "\n| 項目 | 内容 |\n|---|---|\n|  |  |\n",
              },
              {
                label: "コード",
                icon: <Code2Icon />,
                template: "\n```\n\n```\n",
                cursorOffset: 5,
              },
              {
                label: "Mermaid",
                icon: <WorkflowIcon />,
                template:
                  "\n```mermaid\nflowchart TD\n  A[開始] --> B[処理]\n  B --> C[終了]\n```\n",
              },
            ]}
            onSelect={insertTemplate}
          />
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

type MarkdownToolbarItem = {
  label: string;
  icon: ReactNode;
  template: string;
  cursorOffset?: number;
};

type MarkdownToolbarMenuProps = {
  label: string;
  icon: ReactNode;
  items: MarkdownToolbarItem[];
  onSelect: (template: string, cursorOffset?: number) => void;
};

function MarkdownToolbarMenu({
  label,
  icon,
  items,
  onSelect,
}: MarkdownToolbarMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {icon}
          {label}
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuGroup>
          {items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onSelect={() => onSelect(item.template, item.cursorOffset)}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MarkdownPreviewProps = {
  value: string;
  emptyMessage?: string;
  className?: string;
  highlightQuotes?: string[];
};

export function MarkdownPreview({
  value,
  emptyMessage = "プレビューする本文がありません。",
  className,
  highlightQuotes = [],
}: MarkdownPreviewProps) {
  if (!value.trim()) {
    return (
      <div
        className={cn(
          "min-h-48 rounded-md border bg-muted p-3 text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-48 rounded-md border bg-background p-3 text-sm leading-7",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-1 text-2xl font-semibold leading-tight">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 text-xl font-semibold leading-tight">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold leading-tight">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-3 text-base font-semibold leading-tight">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="mb-2 mt-3 text-sm font-semibold leading-tight">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="mb-2 mt-3 text-xs font-semibold leading-tight text-muted-foreground">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </h6>
          ),
          p: ({ children }) => (
            <p className="my-2 whitespace-pre-wrap">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </p>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </a>
          ),
          strong: ({ children }) => (
            <strong>
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </strong>
          ),
          em: ({ children }) => (
            <em>
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          ul: ({ children }) => (
            <ul className="my-2 flex list-disc flex-col gap-1 pl-5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 flex list-decimal flex-col gap-1 pl-5">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </li>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border bg-muted px-2 py-1 text-left font-semibold">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </th>
          ),
          td: ({ children }) => (
            <td className="border px-2 py-1 align-top">
              {renderHighlightedMarkdownChildren(children, highlightQuotes)}
            </td>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const language = getCodeLanguage(className);
            const rawContent = String(children);
            const isCodeBlock = rawContent.includes("\n");
            const content = rawContent.replace(/\n$/, "");

            if (language === "mermaid") {
              return <MermaidDiagram chart={content} />;
            }

            if (language || isCodeBlock) {
              return (
                <pre className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-xs leading-6">
                  <code className={className}>{content}</code>
                </pre>
              );
            }

            return (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {children}
              </code>
            );
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}

const renderHighlightedMarkdownChildren = (
  children: ReactNode,
  highlightQuotes: string[],
) => {
  const quotes = highlightQuotes.filter((quote) => quote.trim());

  if (!quotes.length) {
    return children;
  }

  return Children.map(children, (child, childIndex) => {
    if (typeof child !== "string") {
      return child;
    }
    return renderHighlightedMarkdownText(child, quotes, childIndex);
  });
};

const renderHighlightedMarkdownText = (
  value: string,
  highlightQuotes: string[],
  childIndex: number,
) => {
  const quote = highlightQuotes.find((item) => value.includes(item));

  if (!quote) {
    return value;
  }
  const [before, after] = value.split(quote, 2);

  return (
    <>
      {before}
      <mark
        key={`highlight-${childIndex}`}
        className="rounded-sm bg-yellow-200 px-0.5 text-foreground"
      >
        {quote}
      </mark>
      {after}
    </>
  );
};

type MermaidDiagramProps = {
  chart: string;
};

function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const reactId = useId();
  const diagramId = `mermaid-${reactId.replace(/:/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        setError(null);
        setSvg(null);

        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "default",
        });

        const result = await mermaid.render(diagramId, chart);

        if (!cancelled) {
          setSvg(result.svg);
        }
      } catch {
        if (!cancelled) {
          setError("Mermaidの描画に失敗しました。構文を確認してください。");
        }
      }
    };

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  if (error) {
    return (
      <pre className="my-3 overflow-x-auto rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
        {error}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 rounded-md border bg-muted p-3 text-xs text-muted-foreground">
        Mermaidを描画中...
      </div>
    );
  }

  return (
    <div
      className="my-3 overflow-x-auto rounded-md border bg-white p-3 [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const getCodeLanguage = (className: string | undefined) => {
  return className?.match(/language-(\S+)/)?.[1];
};
