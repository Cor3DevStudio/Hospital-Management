import { PDFDocument } from "pdf-lib";

import type { Attachment } from "@/lib/store";

export type MergeDocumentInput = {
  blob: Blob;
  filename: string;
  mime: string;
};

export type MergeDocumentsResult = {
  blob: Blob;
  mergedCount: number;
  skipped: { filename: string; reason: string }[];
};

function isPdfMime(mime: string, filename: string): boolean {
  const lower = mime.toLowerCase();
  if (lower.includes("pdf")) return true;
  return filename.toLowerCase().endsWith(".pdf");
}

function isJpegMime(mime: string, filename: string): boolean {
  const lower = mime.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return true;
  return /\.jpe?g$/i.test(filename);
}

function isPngMime(mime: string, filename: string): boolean {
  const lower = mime.toLowerCase();
  if (lower.includes("png")) return true;
  return filename.toLowerCase().endsWith(".png");
}

function isMergeableAttachment(attachment: Attachment): boolean {
  return (
    isPdfMime(attachment.mime, attachment.filename) ||
    isJpegMime(attachment.mime, attachment.filename) ||
    isPngMime(attachment.mime, attachment.filename)
  );
}

async function appendPdfBytes(
  target: PDFDocument,
  bytes: Uint8Array,
  filename: string,
): Promise<void> {
  if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error(`"${filename}" is not a valid PDF file.`);
  }

  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = source.getPageCount();
  if (pageCount === 0) {
    throw new Error(`"${filename}" has no pages.`);
  }

  const copied = await target.copyPages(
    source,
    Array.from({ length: pageCount }, (_, index) => index),
  );
  for (const page of copied) {
    target.addPage(page);
  }
}

async function appendImageBytes(
  target: PDFDocument,
  bytes: Uint8Array,
  filename: string,
  mime: string,
): Promise<void> {
  const image = isPngMime(mime, filename)
    ? await target.embedPng(bytes)
    : await target.embedJpg(bytes);

  const width = image.width;
  const height = image.height;
  const page = target.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
}

/** Merge PDF and image attachments into a single PDF (order preserved). */
export async function mergeDocumentsToPdf(
  inputs: MergeDocumentInput[],
): Promise<MergeDocumentsResult> {
  const skipped: MergeDocumentsResult["skipped"] = [];
  const merged = await PDFDocument.create();
  let mergedCount = 0;

  for (const input of inputs) {
    const bytes = new Uint8Array(await input.blob.arrayBuffer());

    try {
      if (isPdfMime(input.mime, input.filename)) {
        await appendPdfBytes(merged, bytes, input.filename);
        mergedCount += 1;
        continue;
      }

      if (isJpegMime(input.mime, input.filename) || isPngMime(input.mime, input.filename)) {
        await appendImageBytes(merged, bytes, input.filename, input.mime);
        mergedCount += 1;
        continue;
      }

      skipped.push({
        filename: input.filename,
        reason: "Only PDF, JPEG, and PNG files can be merged into a PDF package.",
      });
    } catch (error) {
      skipped.push({
        filename: input.filename,
        reason: error instanceof Error ? error.message : "Failed to read file.",
      });
    }
  }

  if (mergedCount === 0) {
    throw new Error(
      skipped.length > 0
        ? skipped.map((item) => `${item.filename}: ${item.reason}`).join(" ")
        : "No mergeable documents were provided.",
    );
  }

  const pdfBytes = await merged.save();
  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    mergedCount,
    skipped,
  };
}

export async function loadAttachmentDocuments(
  attachments: Attachment[],
  getBlob: (key: string) => Promise<Blob | null>,
): Promise<MergeDocumentInput[]> {
  const docs: MergeDocumentInput[] = [];

  for (const attachment of attachments) {
    const blob = await getBlob(attachment.key);
    if (!blob) {
      throw new Error(
        `Could not load "${attachment.filename}". The file may be missing from local storage — re-upload it.`,
      );
    }
    docs.push({
      blob,
      filename: attachment.filename,
      mime: attachment.mime || blob.type || "application/octet-stream",
    });
  }

  return docs;
}

export function sortAttachmentsForMerge(attachments: Attachment[]): Attachment[] {
  return [...attachments].sort((a, b) => {
    const aPdf = isPdfMime(a.mime, a.filename);
    const bPdf = isPdfMime(b.mime, b.filename);
    if (aPdf !== bPdf) return aPdf ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function getMergeableAttachments(attachments: Attachment[]): Attachment[] {
  return sortAttachmentsForMerge(attachments.filter(isMergeableAttachment));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function buildEclaimMergedPdfPackage(
  attachments: Attachment[],
  getBlob: (key: string) => Promise<Blob | null>,
): Promise<MergeDocumentsResult> {
  const mergeable = getMergeableAttachments(attachments);
  if (mergeable.length === 0) {
    throw new Error(
      "No PDF or image attachments to merge. Upload at least one PDF, JPEG, or PNG file.",
    );
  }

  const documents = await loadAttachmentDocuments(mergeable, getBlob);
  return mergeDocumentsToPdf(documents);
}
