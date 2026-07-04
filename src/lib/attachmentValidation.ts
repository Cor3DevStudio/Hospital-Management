export const MAX_ATTACHMENT_SIZE_BYTES = 1.5 * 1024 * 1024;
export const MAX_ATTACHMENT_SIZE_LABEL = "1.5MB";

export function getFileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileValidationResult = {
  valid: boolean;
  message: string;
};

export function validateAttachmentFile(file: File, maxBytes = MAX_ATTACHMENT_SIZE_BYTES): FileValidationResult {
  if (!file) {
    return { valid: false, message: "No file was selected." };
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      message: `File \"${file.name}\" is too large (${getFileSizeLabel(file.size)}). Maximum allowed size is ${MAX_ATTACHMENT_SIZE_LABEL}.`,
    };
  }

  return { valid: true, message: "" };
}
