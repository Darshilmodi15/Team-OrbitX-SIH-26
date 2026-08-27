import React from "react";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

type BlockType =
  | { type: "heading"; level: number; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "numbered_list"; items: string[] }
  | { type: "paragraph"; lines: string[] };

/**
 * Tokenizes inline Markdown syntax (bold, italic, code, links) safely into React nodes.
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  const tokens: React.ReactNode[] = [];
  let key = 0;

  // Regex to match inline tokens:
  // 1. Bold-Italic (***...*** or ___...___)
  // 2. Bold (**...** or __...__)
  // 3. Inline code (`...`)
  // 4. Links ([text](url))
  // 5. Italic (*...* or _..._)
  const pattern = /(\*\*\*[\s\S]+?\*\*\*|___[\s\S]+?___|\*\*[\s\S]+?\*\*|__[\s\S]+?__|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\)|\*[^\*\n]+?\*|_[^_\n]+?_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const matchedStr = match[0];

    if (
      (matchedStr.startsWith("***") && matchedStr.endsWith("***")) ||
      (matchedStr.startsWith("___") && matchedStr.endsWith("___"))
    ) {
      tokens.push(
        <strong key={key++} className="font-bold text-foreground">
          <em className="italic">{parseInline(matchedStr.slice(3, -3))}</em>
        </strong>
      );
    } else if (
      (matchedStr.startsWith("**") && matchedStr.endsWith("**")) ||
      (matchedStr.startsWith("__") && matchedStr.endsWith("__"))
    ) {
      tokens.push(
        <strong key={key++} className="font-bold text-foreground">
          {parseInline(matchedStr.slice(2, -2))}
        </strong>
      );
    } else if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
      tokens.push(
        <code
          key={key++}
          className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[0.85em] text-teal-400 border border-teal-500/20"
        >
          {matchedStr.slice(1, -1)}
        </code>
      );
    } else if (matchedStr.startsWith("[") && matchedStr.includes("](") && matchedStr.endsWith(")")) {
      const linkMatch = matchedStr.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, linkText, href] = linkMatch;
        // Verify href is safe (http, https, mailto, tel)
        const isSafe = /^(https?:\/\/|mailto:|tel:|\/)/i.test(href);
        tokens.push(
          <a
            key={key++}
            href={isSafe ? href : "#"}
            target={isSafe && href.startsWith("http") ? "_blank" : undefined}
            rel={isSafe && href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="text-teal-400 underline underline-offset-2 hover:text-teal-300 transition-colors font-medium"
          >
            {linkText}
          </a>
        );
      } else {
        tokens.push(matchedStr);
      }
    } else if (
      (matchedStr.startsWith("*") && matchedStr.endsWith("*")) ||
      (matchedStr.startsWith("_") && matchedStr.endsWith("_"))
    ) {
      tokens.push(
        <em key={key++} className="italic text-foreground/90">
          {parseInline(matchedStr.slice(1, -1))}
        </em>
      );
    } else {
      tokens.push(matchedStr);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

/**
 * Parses raw text into semantic block structures (headings, lists, paragraphs).
 */
function parseBlocks(rawText: string): BlockType[] {
  const lines = rawText.split(/\r?\n/);
  const blocks: BlockType[] = [];

  let currentParagraph: string[] = [];
  let currentBulletList: string[] = [];
  let currentNumberedList: string[] = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "paragraph", lines: [...currentParagraph] });
      currentParagraph = [];
    }
  }

  function flushBulletList() {
    if (currentBulletList.length > 0) {
      blocks.push({ type: "bullet_list", items: [...currentBulletList] });
      currentBulletList = [];
    }
  }

  function flushNumberedList() {
    if (currentNumberedList.length > 0) {
      blocks.push({ type: "numbered_list", items: [...currentNumberedList] });
      currentNumberedList = [];
    }
  }

  function flushAll() {
    flushParagraph();
    flushBulletList();
    flushNumberedList();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    // Heading (e.g. # Title, ## Subtitle, ### Section)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // Bullet list item (e.g. • text, - text, * text)
    const bulletMatch = trimmed.match(/^([•\-\*])\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      flushNumberedList();
      currentBulletList.push(bulletMatch[2]);
      continue;
    }

    // Numbered list item (e.g. 1. text, 2) text)
    const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      flushBulletList();
      currentNumberedList.push(numberedMatch[2]);
      continue;
    }

    // Regular paragraph line
    flushBulletList();
    flushNumberedList();
    currentParagraph.push(line);
  }

  flushAll();
  return blocks;
}

/**
 * Safe, zero-dependency Markdown Renderer component for ORCA Marine AI messages.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className={cn("space-y-2 text-xs sm:text-sm leading-relaxed break-words", className)}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            if (block.level === 1) {
              return (
                <h1 key={idx} className="font-bold text-foreground text-sm sm:text-base mt-2 mb-1 border-b border-border/40 pb-1">
                  {parseInline(block.text)}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2 key={idx} className="font-bold text-foreground text-xs sm:text-sm mt-2 mb-1">
                  {parseInline(block.text)}
                </h2>
              );
            }
            return (
              <h3 key={idx} className="font-semibold text-foreground text-xs sm:text-sm mt-1.5 mb-0.5">
                {parseInline(block.text)}
              </h3>
            );
          }

          case "bullet_list": {
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1 my-1.5 marker:text-teal-400">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {parseInline(item)}
                  </li>
                ))}
              </ul>
            );
          }

          case "numbered_list": {
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1.5 my-1.5 marker:font-bold marker:text-teal-400">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {parseInline(item)}
                  </li>
                ))}
              </ol>
            );
          }

          case "paragraph": {
            return (
              <p key={idx} className="my-1.5 leading-relaxed">
                {block.lines.map((line, lineIdx) => (
                  <React.Fragment key={lineIdx}>
                    {lineIdx > 0 && <br />}
                    {parseInline(line)}
                  </React.Fragment>
                ))}
              </p>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

export default MarkdownRenderer;
