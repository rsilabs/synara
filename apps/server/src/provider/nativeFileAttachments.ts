// FILE: nativeFileAttachments.ts
// Purpose: literati: decide which non-image file attachments a provider gets
//          inline (text) or as a native document (Claude PDFs) instead of a
//          path the model must open with a shell command.
// Layer: Provider adapter utility

import type { ChatFileAttachment } from "@synara/contracts";

/** Text attachments up to this size are inlined into the prompt. */
export const INLINE_TEXT_ATTACHMENT_MAX_BYTES = 256 * 1024;
/** Claude PDFs up to this size travel as base64 `document` blocks (API request cap is 32 MB). */
export const CLAUDE_NATIVE_PDF_MAX_BYTES = 16 * 1024 * 1024;

const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  "bbl",
  "bib",
  "bst",
  "c",
  "cfg",
  "cls",
  "cpp",
  "css",
  "csv",
  "go",
  "h",
  "html",
  "ini",
  "java",
  "js",
  "json",
  "jsonl",
  "log",
  "lua",
  "m",
  "md",
  "markdown",
  "py",
  "r",
  "rb",
  "rs",
  "rst",
  "sh",
  "sql",
  "sty",
  "svg",
  "tex",
  "toml",
  "ts",
  "tsv",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/x-tex",
  "application/x-latex",
  "application/xml",
  "application/x-yaml",
  "application/yaml",
  "application/toml",
  "application/x-bibtex",
  "application/javascript",
  "application/typescript",
  "application/x-sh",
]);

export function isPdfAttachment(attachment: ChatFileAttachment): boolean {
  return attachment.mimeType.toLowerCase() === "application/pdf" || /\.pdf$/i.test(attachment.name);
}

export function isTextLikeAttachment(attachment: ChatFileAttachment): boolean {
  const mimeType = attachment.mimeType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (mimeType.startsWith("text/") || TEXT_MIME_TYPES.has(mimeType)) return true;
  const extension = /\.([a-z0-9]{1,10})$/i.exec(attachment.name)?.[1]?.toLowerCase();
  return extension !== undefined && TEXT_ATTACHMENT_EXTENSIONS.has(extension);
}

/** Candidate for inlining: text-like and small enough by its declared size. */
export function isInlineTextAttachmentCandidate(attachment: ChatFileAttachment): boolean {
  return (
    isTextLikeAttachment(attachment) && attachment.sizeBytes <= INLINE_TEXT_ATTACHMENT_MAX_BYTES
  );
}

/** Strict UTF-8 decode; binary content (invalid UTF-8 or NUL bytes) stays a path reference. */
export function decodeInlineText(bytes: Uint8Array): string | undefined {
  if (bytes.byteLength > INLINE_TEXT_ATTACHMENT_MAX_BYTES) return undefined;
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
  return text.includes("\u0000") ? undefined : text;
}

export function inlineTextAttachmentBlock(attachment: ChatFileAttachment, text: string): string {
  return [
    `<attached_file name=${JSON.stringify(attachment.name)} type=${JSON.stringify(attachment.mimeType)}>`,
    text,
    "</attached_file>",
  ].join("\n");
}
