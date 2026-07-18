import type { Attachment } from "@/lib/store";

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENT_SIZE_LABEL = "10MB";

const ALLOWED_EXTENSIONS = new Set([".pdf", ".xml", ".jpg", ".jpeg", ".png", ".gif", ".webp"]);

export function getFileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAllowedAttachmentType(file: File): boolean {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;

  const mime = (file.type || "").toLowerCase();
  if (!mime) return false;

  return (
    mime === "application/pdf" ||
    mime === "application/xml" ||
    mime === "text/xml" ||
    mime.startsWith("image/")
  );
}

export type FileValidationResult = {
  valid: boolean;
  message: string;
};

export function validateAttachmentFile(
  file: File,
  maxBytes = MAX_ATTACHMENT_SIZE_BYTES,
): FileValidationResult {
  if (!file) {
    return { valid: false, message: "No file was selected." };
  }

  if (!isAllowedAttachmentType(file)) {
    return {
      valid: false,
      message: `"${file.name}" is not supported. Upload PDF, XML, JPEG, or PNG files.`,
    };
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      message: `File "${file.name}" is too large (${getFileSizeLabel(file.size)}). Maximum allowed size is ${MAX_ATTACHMENT_SIZE_LABEL}.`,
    };
  }

  return { valid: true, message: "" };
}

/** Union attachment metadata by id — keeps locally added files when clinical data reloads. */
export function mergeAttachmentLists(local: Attachment[], remote: Attachment[]): Attachment[] {
  const map = new Map<string, Attachment>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) map.set(item.id, item);
  return Array.from(map.values()).sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.filename.localeCompare(b.filename),
  );
}
