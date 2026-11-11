// FILE: attachmentProjection.ts
// Purpose: Builds provider prompt text for attachments that a provider must read from disk.
// Layer: Provider adapter utility
// Depends on: attachmentStore path resolution and shared byte formatting.

import type { ChatAttachment, ChatFileAttachment, ChatImageAttachment } from "@synara/contracts";
import { formatBytes } from "@synara/shared/formatBytes";

import { resolveProviderAttachmentPath } from "./providerAttachmentPaths.ts";

function isProjectedFileAttachment(
  attachment: ChatAttachment,
  include: "all-files" | "non-pdf-files",
  includeImage: ((attachment: ChatImageAttachment) => boolean) | undefined,
): attachment is ChatImageAttachment | ChatFileAttachment {
  if (attachment.type === "image") {
    return includeImage?.(attachment) ?? false;
  }
  if (attachment.type !== "file") {
    return false;
  }
  if (include === "all-files") {
    return true;
  }
  return attachment.mimeType.toLowerCase() !== "application/pdf";
}

function quotePromptValue(value: string): string {
  return JSON.stringify(value);
}

// Produces a stable path-reference block for regular files and selected non-native image types.
export function buildFileAttachmentsPromptBlock(input: {
  readonly attachments: ReadonlyArray<ChatAttachment> | undefined;
  readonly attachmentsDir: string;
  readonly include: "all-files" | "non-pdf-files";
  readonly includeImage?: (attachment: ChatImageAttachment) => boolean;
  /** literati: attachments already delivered natively (inline text, document blocks). */
  readonly exclude?: (attachment: ChatAttachment) => boolean;
  /** literati: replaces the default "read with your tools" sentence. */
  readonly readInstruction?: string;
}): string | null {
  const lines: string[] = [];
  for (const attachment of input.attachments ?? []) {
    if (!isProjectedFileAttachment(attachment, input.include, input.includeImage)) {
      continue;
    }
    if (input.exclude?.(attachment)) {
      continue;
    }
    const attachmentPath = resolveProviderAttachmentPath({
      attachmentsDir: input.attachmentsDir,
      attachment,
    });
    if (!attachmentPath) {
      console.warn(`[attachments] Skipping unresolved file attachment path for ${attachment.id}.`);
      continue;
    }
    lines.push(
      `- ${quotePromptValue(attachment.name)} - ${attachment.mimeType} - ${formatBytes(attachment.sizeBytes)} - ${attachmentPath}`,
    );
  }

  if (lines.length === 0) {
    return null;
  }

  return [
    "<attached_files>",
    input.readInstruction ??
      "The user attached the following file(s), saved on disk. Read/extract them with your tools as needed; do not assume their contents.",
    ...lines,
    "</attached_files>",
  ].join("\n");
}

export function appendFileAttachmentsPromptBlock(input: {
  readonly text: string | undefined;
  readonly attachments: ReadonlyArray<ChatAttachment> | undefined;
  readonly attachmentsDir: string;
  readonly include: "all-files" | "non-pdf-files";
  readonly includeImage?: (attachment: ChatImageAttachment) => boolean;
  readonly exclude?: (attachment: ChatAttachment) => boolean;
}): string | undefined {
  const fileBlock = buildFileAttachmentsPromptBlock({
    attachments: input.attachments,
    attachmentsDir: input.attachmentsDir,
    include: input.include,
    ...(input.includeImage ? { includeImage: input.includeImage } : {}),
    ...(input.exclude ? { exclude: input.exclude } : {}),
  });
  return fileBlock ? `${input.text ?? ""}${input.text ? "\n\n" : ""}${fileBlock}` : input.text;
}
