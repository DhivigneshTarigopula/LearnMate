import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import './MarkdownRenderer.css';

/**
 * Format inline markdown tokens: bold, italic, code, math symbols
 */
function renderInlineText(text) {
  if (!text) return null;

  // Split by inline code `...` or math $...$
  const parts = [];
  const tokenRegex = /(`([^`]+)`|\$([^$\n]+)\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderFormattedText(text.substring(lastIndex, match.index)));
    }
    if (match[2]) {
      // Inline code
      parts.push(
        <code key={`code-${match.index}`} className="inline-code">
          {match[2]}
        </code>
      );
    } else if (match[3]) {
      // Inline math formula
      parts.push(
        <span key={`math-${match.index}`} className="inline-math">
          {match[3]}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(renderFormattedText(text.substring(lastIndex)));
  }

  return parts;
}

/**
 * Helper to handle bold (**...**) and italic (*...*) inside text
 */
function renderFormattedText(text) {
  // Replace **bold**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(renderItalicText(text.substring(lastIndex, match.index)));
    }
    elements.push(
      <strong key={`b-${match.index}`} className="md-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(renderItalicText(text.substring(lastIndex)));
  }

  return elements;
}

function renderItalicText(text) {
  const italicRegex = /(?:^|[^*])\*([^*]+)\*/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = italicRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const content = match[1];
    const startIndex = match.index + (fullMatch.startsWith('*') ? 0 : 1);

    if (startIndex > lastIndex) {
      elements.push(text.substring(lastIndex, startIndex));
    }
    elements.push(
      <em key={`i-${startIndex}`} className="md-italic">
        {content}
      </em>
    );
    lastIndex = startIndex + content.length + 2; // for the * on each side
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
}

/**
 * Code Block with syntax styling and one-click copy button
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{language || 'code'}</span>
        <button
          className="md-code-copy-btn"
          onClick={handleCopy}
          type="button"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check size={14} className="copied-icon" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="md-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Main Markdown Parser & Renderer for LearnMate AI responses
 */
export const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Split content into code blocks vs non-code blocks
  const blocks = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }
    blocks.push({
      type: 'code',
      language: match[1]?.trim() || 'plaintext',
      code: match[2]?.replace(/\n$/, ''),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  return (
    <div className="learnmate-markdown">
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          return (
            <CodeBlock
              key={`block-code-${bIdx}`}
              language={block.language}
              code={block.code}
            />
          );
        }

        // Parse regular text line by line
        const lines = block.content.split('\n');
        const elements = [];
        let inList = false;
        let listType = null;
        let listItems = [];

        const flushList = () => {
          if (inList && listItems.length > 0) {
            if (listType === 'ol') {
              elements.push(
                <ol key={`ol-${elements.length}`} className="md-ol">
                  {listItems.map((item, idx) => (
                    <li key={`li-${idx}`}>{renderInlineText(item)}</li>
                  ))}
                </ol>
              );
            } else {
              elements.push(
                <ul key={`ul-${elements.length}`} className="md-ul">
                  {listItems.map((item, idx) => (
                    <li key={`li-${idx}`}>{renderInlineText(item)}</li>
                  ))}
                </ul>
              );
            }
            listItems = [];
            inList = false;
            listType = null;
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          if (!trimmed) {
            flushList();
            continue;
          }

          // Block display math equations $$...$$
          if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
            flushList();
            elements.push(
              <div key={`disp-math-${i}`} className="md-display-math">
                {trimmed.slice(2, -2).trim()}
              </div>
            );
            continue;
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            flushList();
            elements.push(
              <h4 key={`h3-${i}`} className="md-h3">
                {renderInlineText(trimmed.replace(/^###\s+/, ''))}
              </h4>
            );
            continue;
          }
          if (trimmed.startsWith('## ')) {
            flushList();
            elements.push(
              <h3 key={`h2-${i}`} className="md-h2">
                {renderInlineText(trimmed.replace(/^##\s+/, ''))}
              </h3>
            );
            continue;
          }
          if (trimmed.startsWith('# ')) {
            flushList();
            elements.push(
              <h2 key={`h1-${i}`} className="md-h1">
                {renderInlineText(trimmed.replace(/^#\s+/, ''))}
              </h2>
            );
            continue;
          }

          // Blockquotes
          if (trimmed.startsWith('> ')) {
            flushList();
            elements.push(
              <blockquote key={`bq-${i}`} className="md-blockquote">
                {renderInlineText(trimmed.replace(/^>\s+/, ''))}
              </blockquote>
            );
            continue;
          }

          // Unordered Lists: - or *
          const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
          if (ulMatch) {
            if (!inList || listType !== 'ul') {
              flushList();
              inList = true;
              listType = 'ul';
            }
            listItems.push(ulMatch[1]);
            continue;
          }

          // Ordered Lists: 1. or 2.
          const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
          if (olMatch) {
            if (!inList || listType !== 'ol') {
              flushList();
              inList = true;
              listType = 'ol';
            }
            listItems.push(olMatch[1]);
            continue;
          }

          // Plain paragraph line
          flushList();
          elements.push(
            <p key={`p-${i}`} className="md-p">
              {renderInlineText(trimmed)}
            </p>
          );
        }

        flushList();
        return <div key={`block-text-${bIdx}`}>{elements}</div>;
      })}
    </div>
  );
};
