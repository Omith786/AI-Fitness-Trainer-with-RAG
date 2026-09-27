import { Fragment, type ReactNode } from "react";

/**
 * A deliberately small Markdown-ish renderer for assistant answers. It covers
 * the formatting a chat model actually produces (paragraphs, bullet lists and
 * bold) plus inline [n] citation markers, without pulling in a full Markdown
 * dependency. Input is treated as plain text and only these patterns are
 * interpreted, so there is no raw HTML injection.
 */
export function MessageContent({ text }: { text: string }): ReactNode {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^\s*([-*]|\d+\.)\s+/.test(line));

        if (isList) {
          return (
            <ul key={index}>
              {lines.map((line, i) => (
                <li key={i}>{renderInline(line.replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{renderInline(block)}</p>;
      })}
    </>
  );
}

// Matches **bold** spans and [12] citation markers.
const INLINE_PATTERN = /(\*\*[^*]+\*\*|\[\d+\])/g;

function renderInline(text: string): ReactNode {
  const parts = text.split(INLINE_PATTERN).filter((part) => part.length > 0);
  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (/^\[\d+\]$/.test(part)) {
      return (
        <sup key={index} className="citation-marker">
          {part.slice(1, -1)}
        </sup>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
