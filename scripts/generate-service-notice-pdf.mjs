/**
 * Generates SYSTEM_SERVICE_NOTICE.pdf with fixed service costing.
 * Run: node scripts/generate-service-notice-pdf.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outPath = join(root, "SYSTEM_SERVICE_NOTICE.pdf");

const PAGE_WIDTH = 612; // Letter
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const ink = rgb(0.12, 0.14, 0.18);
const muted = rgb(0.35, 0.38, 0.42);
const accent = rgb(0.12, 0.35, 0.55);
const line = rgb(0.82, 0.85, 0.88);
const tableBg = rgb(0.96, 0.97, 0.98);
const headerBg = rgb(0.12, 0.35, 0.55);

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function main() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN_TOP;

  const drawCentered = (text, font, size, color) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_WIDTH - w) / 2,
      y,
      size,
      font,
      color,
    });
  };

  // Header
  drawCentered("SYSTEM SERVICE NOTICE", bold, 16, accent);
  y -= 18;
  drawCentered("Fixed Service Costing & Policy Update", regular, 10, muted);
  y -= 14;

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 1,
    color: line,
  });
  y -= 22;

  const paragraphs = [
    "Good day!",
    "Please be informed of an important update regarding your system:",
    "Effective immediately after the recent Sidebar update, we will no longer be accepting free reworks or free revisions. Moving forward, all changes, customizations, and revisions to your system will be chargeable.",
    "We have also upgraded your system storage from 2GB to 5GB to maximize capacity, improve performance, and help prevent lagging. This upgrade ensures our optimizations continue to work properly on your current system.",
    "Kindly note that the 5GB storage limit must be observed. If the storage becomes overdue, or if additional data is added beyond 5GB, the system will enter maintenance mode.",
    "If 5GB is no longer enough for your operations, we recommend switching from MariaDB to a Hosted Database to avoid storage-related issues and ensure smoother, more scalable performance.",
  ];

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, regular, 10, CONTENT_WIDTH);
    for (const ln of lines) {
      page.drawText(ln, { x: MARGIN_X, y, size: 10, font: regular, color: ink });
      y -= 14;
    }
    y -= 8;
  }

  // Costing section title
  y -= 4;
  page.drawText("FIXED SERVICE COSTING", {
    x: MARGIN_X,
    y,
    size: 12,
    font: bold,
    color: accent,
  });
  y -= 10;

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 1,
    color: line,
  });
  y -= 18;

  const rows = [
    ["Service Item", "Fixed Cost"],
    ["Monthly Retainer", "PHP 15,000"],
    ["Revisions / Changes (each)", "PHP 5,000"],
    ["Storage Overrun Recovery", "PHP 7,000"],
    ["Hosted DB Migration (we provide hosting)", "PHP 40,000"],
    ["Hosted DB Migration (you provide hosting)", "PHP 30,000"],
  ];

  const col1 = MARGIN_X;
  const col2 = MARGIN_X + CONTENT_WIDTH * 0.62;
  const rowH = 22;

  rows.forEach((row, index) => {
    const isHeader = index === 0;
    const bg = isHeader ? headerBg : index % 2 === 0 ? tableBg : rgb(1, 1, 1);
    const textColor = isHeader ? rgb(1, 1, 1) : ink;
    const font = isHeader ? bold : regular;

    page.drawRectangle({
      x: MARGIN_X,
      y: y - 6,
      width: CONTENT_WIDTH,
      height: rowH,
      color: bg,
      borderColor: line,
      borderWidth: 0.5,
    });

    page.drawText(row[0], {
      x: col1 + 10,
      y: y + 1,
      size: 9.5,
      font,
      color: textColor,
    });
    page.drawText(row[1], {
      x: col2 + 10,
      y: y + 1,
      size: 9.5,
      font,
      color: textColor,
    });

    y -= rowH;
  });

  y -= 20;

  const closing = [
    "Thank you for your understanding and continued trust. Should you have any questions, feel free to message us.",
    "Respectfully,",
  ];

  for (const paragraph of closing) {
    const lines = wrapText(paragraph, regular, 10, CONTENT_WIDTH);
    for (const ln of lines) {
      page.drawText(ln, { x: MARGIN_X, y, size: 10, font: regular, color: ink });
      y -= 14;
    }
    y -= 8;
  }

  // Footer
  page.drawText("All prices are fixed. Rates are subject to change with prior notice.", {
    x: MARGIN_X,
    y: 36,
    size: 8,
    font: regular,
    color: muted,
  });

  const bytes = await pdf.save();
  writeFileSync(outPath, bytes);
  console.log(`Generated: ${outPath}`);
}

main().catch((error) => {
  console.error("Failed to generate PDF:", error);
  process.exit(1);
});
