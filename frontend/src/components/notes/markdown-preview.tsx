"use client";

import { Latex } from "@/components/latex";

type MarkdownPreviewProps = {
  content: string;
  emptyText?: string;
};

type Block =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "bullet-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "code"; content: string }
  | { type: "question-embed"; questionId: string };

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    // Question embed block: :::question{id=<uuid>}
    const questionMatch = trimmed.match(/^:::question\{id=([a-f0-9-]+)\}$/i);
    if (questionMatch) {
      blocks.push({ type: "question-embed", questionId: questionMatch[1] });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: "bullet-list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || next.startsWith("```") || next.startsWith("- ") || /^\d+\.\s+/.test(next) || /^#{1,6}\s+/.test(next) || /^:::question\{/.test(next)) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }
    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") });
  }

  return blocks;
}

/**
 * Parse inline Markdown: LaTeX ($...$, $$...$$), **bold**, *italic*, `code`.
 * Returns an array of React nodes for mixed rendering.
 */
function renderInline(text: string) {
  // Regex to split on: $$...$$, $...$, **...**, *...*, `...`
  const inlineRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  const parts = text.split(inlineRegex);

  if (parts.length === 1 && !inlineRegex.test(text)) {
    return text;
  }

  return parts.map((part, index) => {
    if (!part) return null;

    // Display math: $$...$$
    if (part.startsWith("$$") && part.endsWith("$$")) {
      return <Latex key={index}>{part}</Latex>;
    }
    // Inline math: $...$
    if (part.startsWith("$") && part.endsWith("$") && part.length > 1) {
      return <Latex key={index}>{part}</Latex>;
    }
    // Bold: **...**
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
    }
    // Italic: *...*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
      return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    }
    // Inline code: `...`
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-cyan-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function MarkdownPreview({ content, emptyText = "开始输入内容后，这里会显示预览。" }: MarkdownPreviewProps) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) {
    return <div className="text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="space-y-4 text-sm leading-7 text-slate-200">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const headingClasses = {
            1: "text-3xl font-semibold text-slate-50",
            2: "text-2xl font-semibold text-slate-100",
            3: "text-xl font-semibold text-slate-100",
            4: "text-lg font-semibold text-slate-200",
            5: "text-base font-semibold text-slate-200",
            6: "text-sm font-semibold uppercase tracking-wide text-slate-300",
          } as const;
          return (
            <div key={`${block.type}-${index}`} className={headingClasses[block.level as keyof typeof headingClasses]}>
              {renderInline(block.content)}
            </div>
          );
        }

        if (block.type === "bullet-list") {
          return (
            <ul key={`${block.type}-${index}`} className="space-y-2 pl-5 text-slate-200">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-disc">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={`${block.type}-${index}`} className="space-y-2 pl-5 text-slate-200">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-decimal">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={`${block.type}-${index}`}
              className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs leading-6 text-cyan-200"
            >
              {block.content}
            </pre>
          );
        }

        if (block.type === "question-embed") {
          return (
            <div
              key={`${block.type}-${index}`}
              className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 text-sm text-sky-200"
            >
              📝 题目引用: <code className="text-xs text-sky-300">{block.questionId}</code>
              <span className="ml-2 text-xs text-slate-500">(加载中...)</span>
            </div>
          );
        }

        return (
          <div key={`${block.type}-${index}`} className="whitespace-pre-wrap text-slate-200">
            {renderInline(block.content)}
          </div>
        );
      })}
    </div>
  );
}
