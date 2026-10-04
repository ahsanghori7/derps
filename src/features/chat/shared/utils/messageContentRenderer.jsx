import { Fragment } from "react";
import {
  URL_REGEX,
  MENTION_REGEX,
  parseInlineFormatting,
  groupMessageBlocks,
} from "./chatUtility";

/** Renders a plain-text segment with URLs as clickable links and @mentions as highlighted text. */
const renderPlainSegment = (
  text,
  linkClassName,
  mentionClassName,
  keyPrefix,
) => {
  if (!text) return null;

  const mentionParts = text.split(MENTION_REGEX);

  return mentionParts.map((part, i) => {
    const isMention = i % 2 === 1;

    if (isMention) {
      return (
        <span
          key={`${keyPrefix}-m${i}`}
          className={
            mentionClassName ||
            "font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded"
          }
        >
          @{part}
        </span>
      );
    }

    const urlParts = part.split(URL_REGEX);
    return (
      <Fragment key={`${keyPrefix}-p${i}`}>
        {urlParts.map((urlPart, j) => {
          const isUrl =
            urlPart.startsWith("http://") || urlPart.startsWith("https://");
          if (isUrl) {
            const urlBreakClass =
              urlPart.length > 40 ? "break-all" : "break-words";
            return (
              <a
                key={`${keyPrefix}-u${i}-${j}`}
                href={urlPart}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClassName || "underline hover:opacity-90"} ${urlBreakClass}`}
                onClick={(e) => e.stopPropagation()}
              >
                {urlPart}
              </a>
            );
          }

          // Prefer word-based wrapping for normal text, but if this
          // segment contains any very long token (e.g. JWTs, hashes,
          // long URLs in code / curl / JSON), allow breaking anywhere.
          const hasLongToken =
            typeof urlPart === "string" &&
            urlPart
              .split(/\s+/)
              .some((token) => token.length > 40);

          return (
            <span
              key={`${keyPrefix}-t${i}-${j}`}
              className={hasLongToken ? "break-all" : "break-words"}
            >
              {urlPart}
            </span>
          );
        })}
      </Fragment>
    );
  });
};

const renderInlineNodes = (
  nodes,
  linkClassName,
  mentionClassName,
  keyPrefix,
) =>
  nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.type === "text") {
      return (
        <Fragment key={key}>
          {renderPlainSegment(node.value, linkClassName, mentionClassName, key)}
        </Fragment>
      );
    }
    if (node.type === "code") {
      return (
        <code
          key={key}
          className="px-1 py-0.5 rounded bg-black/20 dark:bg-white/20 font-mono text-[0.85em] break-all"
        >
          {node.value}
        </code>
      );
    }
    const children = renderInlineNodes(
      node.children,
      linkClassName,
      mentionClassName,
      key,
    );
    if (node.type === "bold") {
      return (
        <strong key={key} className="font-bold">
          {children}
        </strong>
      );
    }
    if (node.type === "italic") {
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    }
    if (node.type === "strikethrough") {
      return (
        <span key={key} style={{ textDecoration: "line-through" }}>
          {children}
        </span>
      );
    }
    return null;
  });

/**
 * Renders message text with markdown-style formatting:
 * - Block-level: numbered list (`1. `), bullet list (`- `), quote (`> `)
 * - Inline: **bold**, *italic*, ~~strikethrough~~, `inline code`
 * - Plus existing URL and @mention rendering.
 */
export const renderMessageContent = (
  text,
  linkClassName = "",
  mentionClassName = "",
) => {
  if (!text || typeof text !== "string") return text;

  const groups = groupMessageBlocks(text);

  const renderLine = (raw, key) =>
    renderInlineNodes(
      parseInlineFormatting(raw),
      linkClassName,
      mentionClassName,
      key,
    );

  return groups.map((group, gi) => {
    const key = `g${gi}`;
    if (group.kind === "ol") {
      return (
        <ol
          key={key}
          className="list-decimal pl-5 my-1 space-y-0.5"
        >
          {group.items.map((item, i) => (
            <li key={`${key}-li${i}`}>{renderLine(item, `${key}-li${i}`)}</li>
          ))}
        </ol>
      );
    }
    if (group.kind === "ul") {
      return (
        <ul
          key={key}
          className="list-disc pl-5 my-1 space-y-0.5"
        >
          {group.items.map((item, i) => (
            <li key={`${key}-li${i}`}>{renderLine(item, `${key}-li${i}`)}</li>
          ))}
        </ul>
      );
    }
    if (group.kind === "quote") {
      return (
        <blockquote
          key={key}
          className="border-l-4 border-current/40 pl-2 my-1 opacity-90 italic"
        >
          {group.items.map((item, i) => (
            <div key={`${key}-q${i}`}>{renderLine(item, `${key}-q${i}`)}</div>
          ))}
        </blockquote>
      );
    }
    // plain text group: preserve line breaks between items
    return (
      <Fragment key={key}>
        {group.items.map((item, i) => (
          <Fragment key={`${key}-l${i}`}>
            {i > 0 && <br />}
            {renderLine(item, `${key}-l${i}`)}
          </Fragment>
        ))}
      </Fragment>
    );
  });
};
