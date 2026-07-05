import { strict as assert } from "assert";
import { PDFDocument } from "pdf-lib";

import {
  buildEclaimMergedPdfPackage,
  mergeDocumentsToPdf,
} from "./eclaimDocumentService";
import type { Attachment } from "@/lib/store";

async function createSamplePdf(label: string): Promise<Blob> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  page.drawText(label, { x: 50, y: 100, size: 14 });
  const bytes = await doc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

async function run() {
  const pdfA = await createSamplePdf("Document A");
  const pdfB = await createSamplePdf("Document B");

  const merged = await mergeDocumentsToPdf([
    { blob: pdfA, filename: "a.pdf", mime: "application/pdf" },
    { blob: pdfB, filename: "b.pdf", mime: "application/pdf" },
  ]);

  assert.equal(merged.mergedCount, 2);
  assert.equal(merged.skipped.length, 0);

  const parsed = await PDFDocument.load(await merged.blob.arrayBuffer());
  assert.equal(parsed.getPageCount(), 2);

  const blobs = new Map<string, Blob>([
    ["key-a", pdfA],
    ["key-b", pdfB],
  ]);

  const attachments: Attachment[] = [
    {
      id: "key-a",
      key: "key-a",
      filename: "a.pdf",
      mime: "application/pdf",
      size: pdfA.size,
      createdAt: "2026-01-01T00:00:00.000Z",
      refType: "eclaim",
      refId: "ECL-1",
    },
    {
      id: "key-b",
      key: "key-b",
      filename: "b.pdf",
      mime: "application/pdf",
      size: pdfB.size,
      createdAt: "2026-01-02T00:00:00.000Z",
      refType: "eclaim",
      refId: "ECL-1",
    },
  ];

  const packaged = await buildEclaimMergedPdfPackage(attachments, async (key) => blobs.get(key) ?? null);
  const packagedDoc = await PDFDocument.load(await packaged.blob.arrayBuffer());
  assert.equal(packagedDoc.getPageCount(), 2);

  console.log("eclaimDocumentService.test.ts: all assertions passed");
}

void run();
