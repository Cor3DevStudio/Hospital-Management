/**
 * Generates: docs/proposals/Missing-Features-Upgrade-Proposal.pdf
 * Run: node scripts/generate-missing-features-proposal.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "docs", "proposals");
const OUT_PDF = join(OUT_DIR, "Missing-Features-Upgrade-Proposal.pdf");
const OUT_HTML = join(OUT_DIR, "Missing-Features-Upgrade-Proposal.html");

const BASELINE_SYSTEM_COST = "PHP 21,000";

/** Fixed upgrade prices (PHP) — budget-scaled to base system at PHP 21,000 */
const FEATURES = [
  {
    no: 1,
    name: "Nursing & Clinical Documentation",
    summary: "Vitals charting, intake/output, nursing notes, and medication administration record (MAR).",
    module: "New: Nursing",
    priceAmount: 7500,
  },
  {
    no: 2,
    name: "Real-Time Bed & Ward Management",
    summary: "Visual bed map, occupancy census, bed assignment, and transfer workflow.",
    module: "Extends: Admission",
    priceAmount: 6500,
  },
  {
    no: 3,
    name: "OPD / ER Queue Management Board",
    summary: "Live queue display, token numbers, triage sorting, and now-serving screens.",
    module: "Extends: OPD, ER",
    priceAmount: 3000,
  },
  {
    no: 4,
    name: "Doctor Schedule & Slot Management",
    summary: "Recurring schedules, per-slot capacity, leave blocks, and booking conflict checks.",
    module: "Extends: Appointments",
    priceAmount: 4000,
  },
  {
    no: 5,
    name: "Operating Room / Surgery Module",
    summary: "OR scheduling, pre-op checklist, operative record, and implant tracking.",
    module: "New: OR / Surgery",
    priceAmount: 8500,
  },
  {
    no: 6,
    name: "Dialysis Unit Workflow",
    summary: "Session scheduling, machine assignment, treatment sheets, and recurring billing.",
    module: "New: Dialysis",
    priceAmount: 7500,
  },
  {
    no: 7,
    name: "Procurement & Purchase Orders",
    summary: "Vendor catalog, PO creation, goods receiving, and supplier invoice matching.",
    module: "Extends: Inventory",
    priceAmount: 6500,
  },
  {
    no: 8,
    name: "HMO / Private Insurance Module",
    summary: "LOA tracking, benefit limits, co-pay rules, and insurer receivables aging.",
    module: "New: Insurance",
    priceAmount: 7500,
  },
  {
    no: 9,
    name: "ICD-10 / RVS Coding Library",
    summary: "Searchable diagnosis and procedure code picker with validation for claim forms.",
    module: "Extends: PhilHealth, OPD",
    priceAmount: 3500,
  },
  {
    no: 10,
    name: "Automated PhilHealth Eligibility Check",
    summary: "Real-time PIN and membership verification before admission and billing.",
    module: "Extends: PhilHealth, Patients",
    priceAmount: 4500,
  },
  {
    no: 11,
    name: "Patient Portal",
    summary: "Online appointments, lab results, bill inquiry, and document download for patients.",
    module: "New: Patient Portal",
    priceAmount: 8500,
  },
  {
    no: 12,
    name: "Telemedicine / Video Consult",
    summary: "Virtual OPD visits with scheduling, e-prescription, and consent capture.",
    module: "Extends: OPD",
    priceAmount: 8000,
  },
  {
    no: 13,
    name: "SMS / Email Notification Engine",
    summary: "Appointment reminders, lab-ready alerts, payment receipts, and discharge instructions.",
    module: "New: Notifications",
    priceAmount: 3000,
  },
  {
    no: 14,
    name: "Multi-Branch / Multi-Facility",
    summary: "Central admin, per-branch data isolation, and consolidated reporting.",
    module: "New: Platform",
    priceAmount: 10000,
  },
  {
    no: 15,
    name: "Analytics & BI Dashboard",
    summary: "Drill-down KPIs, physician productivity, AR aging, and claims denial trends.",
    module: "New: Analytics",
    priceAmount: 6500,
  },
  {
    no: 16,
    name: "Comprehensive Audit Log",
    summary: "Immutable trail of PHI access, billing edits, inventory changes, and admin actions.",
    module: "New: Audit",
    priceAmount: 4000,
  },
  {
    no: 17,
    name: "Field-Level RBAC",
    summary: "Per-action permissions (create, edit, delete, print) beyond page-level access.",
    module: "Extends: Auth, Settings",
    priceAmount: 5000,
  },
  {
    no: 18,
    name: "HL7 / FHIR Interoperability",
    summary: "Standard APIs for ADT, orders, results, and documents with external systems.",
    module: "New: Integration Hub",
    priceAmount: 11000,
  },
  {
    no: 19,
    name: "Digital Signature for Records",
    summary: "E-signature capture on SOA, consents, discharge summaries, and claim forms.",
    module: "Extends: Billing, PhilHealth",
    priceAmount: 4000,
  },
  {
    no: 20,
    name: "Automated Backup & Disaster Recovery",
    summary: "Scheduled encrypted backups, off-site copy, and guided restore procedures.",
    module: "Extends: Settings",
    priceAmount: 3500,
  },
  {
    no: 21,
    name: "HR & Staff Credentialing",
    summary: "License expiry tracking, department assignment, and duty roster management.",
    module: "New: HR",
    priceAmount: 5000,
  },
  {
    no: 22,
    name: "Consent & Forms Management",
    summary: "Versioned consent templates, captured signatures, and encounter linkage.",
    module: "New: Document Management",
    priceAmount: 4500,
  },
  {
    no: 23,
    name: "PACS / Medical Imaging Viewer",
    summary: "Store and view DICOM studies linked to radiology orders.",
    module: "Extends: Radiology",
    priceAmount: 11000,
  },
  {
    no: 24,
    name: "Structured Laboratory Information System (LIS)",
    summary: "Specimen tracking, reference ranges, and instrument result import.",
    module: "Extends: Laboratory",
    priceAmount: 9500,
  },
];

const BUNDLES = [
  {
    name: "Starter Pack",
    includes: "Queue Board + SMS/Email + ICD-10 Library + Backup/DR + Audit Log",
    priceAmount: 15000,
    note: "Save PHP 2,500 vs individual (PHP 17,500)",
  },
  {
    name: "Clinical Operations Pack",
    includes: "Nursing Module + Bed Management + Doctor Schedule + Consent/Forms",
    priceAmount: 20000,
    note: "Save PHP 2,500 vs individual (PHP 22,500)",
  },
  {
    name: "PhilHealth Plus Pack",
    includes: "Eligibility Check + ICD-10 Library + Digital Signature + Analytics Dashboard",
    priceAmount: 17500,
    note: "Save PHP 2,000 vs individual (PHP 19,500)",
  },
];

function formatPhp(amount) {
  return `PHP ${amount.toLocaleString("en-PH")}`;
}

const CATALOG_TOTAL = FEATURES.reduce((sum, f) => sum + f.priceAmount, 0);

function wrapText(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function buildPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 48;

  const brand = rgb(0.11, 0.37, 0.13);
  const ink = rgb(0.12, 0.14, 0.18);
  const muted = rgb(0.38, 0.42, 0.48);
  const accent = rgb(0.05, 0.28, 0.55);

  let page = doc.addPage([pageW, pageH]);
  let y = pageH - margin;

  const newPage = () => {
    page = doc.addPage([pageW, pageH]);
    y = pageH - margin;
  };

  const ensureSpace = (needed) => {
    if (y - needed < margin) newPage();
  };

  const drawLine = (yPos, color = rgb(0.85, 0.87, 0.9), thickness = 1) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: pageW - margin, y: yPos },
      thickness,
      color,
    });
  };

  const drawText = (text, x, yPos, size = 10, bold = false, color = ink) => {
    page.drawText(text, {
      x,
      y: yPos,
      size,
      font: bold ? fontBold : font,
      color,
    });
  };

  // Cover
  drawText("UPGRADE PROPOSAL", margin, y, 11, true, brand);
  y -= 28;
  drawText("Missing Features", margin, y, 22, true, ink);
  y -= 26;
  drawText("Hospital Management System", margin, y, 14, false, muted);
  y -= 36;
  drawLine(y);
  y -= 28;

  const intro = [
    "This proposal lists standard HMS capabilities not yet included in your current system.",
    `Your base HMS was delivered at ${BASELINE_SYSTEM_COST}. All upgrade prices below are`,
    "fixed, budget-friendly, and billed per selected module only.",
  ];
  for (const line of intro) {
    drawText(line, margin, y, 10, false, ink);
    y -= 14;
  }

  y -= 10;
  drawText("Prepared for:", margin, y, 9, true, muted);
  drawText("Hospital Client  |  Date: July 2026", margin + 72, y, 9, false, ink);
  y -= 22;

  const notes = [
    "All prices are fixed in Philippine Peso (PHP), exclusive of third-party API/hosting fees.",
    `Full catalog value: ${formatPhp(CATALOG_TOTAL)} (if all 24 features are ordered).`,
    "Payment terms: 50% upon approval, 50% upon UAT sign-off.",
  ];
  for (const line of notes) {
    drawText("-  " + line, margin, y, 8.5, false, muted);
    y -= 12;
  }

  newPage();
  drawText("Feature Catalog — Fixed Price List", margin, y, 13, true, brand);
  y -= 10;
  drawLine(y);
  y -= 22;

  for (const f of FEATURES) {
    ensureSpace(78);
    drawText(`${f.no}. ${f.name}`, margin, y, 11, true, ink);
    y -= 14;

    for (const line of wrapText(f.summary, 92)) {
      drawText(line, margin + 8, y, 9, false, muted);
      y -= 12;
    }

    drawText(`Module: ${f.module}`, margin + 8, y, 8.5, false, accent);
    y -= 13;
    drawText(`Fixed Price: ${formatPhp(f.priceAmount)}`, margin + 8, y, 10, true, brand);
    y -= 16;
    drawLine(y - 2, rgb(0.92, 0.93, 0.95), 0.5);
    y -= 14;
  }

  ensureSpace(100);
  drawText("Recommended Fixed-Price Bundles", margin, y, 12, true, brand);
  y -= 16;

  for (const b of BUNDLES) {
    ensureSpace(52);
    drawText(b.name, margin, y, 10, true, ink);
    y -= 13;
    for (const line of wrapText(b.includes, 95)) {
      drawText(line, margin + 8, y, 8.5, false, muted);
      y -= 11;
    }
    drawText(`Bundle Price: ${formatPhp(b.priceAmount)}  (${b.note})`, margin + 8, y, 9, true, brand);
    y -= 18;
  }

  ensureSpace(120);
  y -= 6;
  drawText("Terms & Conditions (Summary)", margin, y, 12, true, brand);
  y -= 16;
  const terms = [
    "Scope covers software development and integration into the existing HMS codebase only.",
    "Hardware, internet, SMS credits, payment gateway fees, and cloud hosting are client-provided unless agreed.",
    "Timeline depends on selected features; simple modules ~1-2 weeks, major modules ~3-6 weeks each.",
    "Quoted fixed prices are valid for 30 days from proposal date.",
    "Warranty: 30-day defect fix period per delivered feature after go-live.",
  ];
  for (const t of terms) {
    for (const line of wrapText(t, 95)) {
      ensureSpace(14);
      drawText("-  " + line, margin, y, 8.5, false, ink);
      y -= 12;
    }
    y -= 2;
  }

  y -= 8;
  ensureSpace(40);
  drawLine(y);
  y -= 20;
  drawText("Acceptance", margin, y, 11, true, ink);
  y -= 18;
  drawText("Client Representative: _________________________________    Date: ______________", margin, y, 9);
  y -= 16;
  drawText("Service Provider: _____________________________________    Date: ______________", margin, y, 9);
  y -= 22;
  drawText("Select individual features or a bundle above. Total = sum of chosen fixed prices.", margin, y, 8.5, false, muted);

  const pdfBytes = await doc.save();
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PDF, pdfBytes);
  console.log("Wrote", OUT_PDF);
}

function buildHtml() {
  const rows = FEATURES.map(
    (f) => `
      <tr>
        <td class="num">${f.no}</td>
        <td><strong>${f.name}</strong><br><span class="desc">${f.summary}</span></td>
        <td class="module">${f.module}</td>
        <td class="price">${formatPhp(f.priceAmount)}</td>
      </tr>`
  ).join("");

  const bundleRows = BUNDLES.map(
    (b) => `
      <tr>
        <td><strong>${b.name}</strong><br><span class="desc">${b.includes}</span></td>
        <td class="price">${formatPhp(b.priceAmount)}</td>
        <td class="note">${b.note}</td>
      </tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Missing Features Upgrade Proposal — HMS</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #1e2430; font-size: 10.5pt; line-height: 1.45; margin: 0; }
    .cover { page-break-after: always; padding-top: 24mm; }
    .brand { color: #1b5e20; font-weight: 700; letter-spacing: 0.06em; font-size: 10pt; text-transform: uppercase; }
    h1 { font-size: 26pt; margin: 8px 0 4px; color: #111827; }
    h2 { font-size: 13pt; color: #1b5e20; margin: 0 0 8px; }
    .subtitle { color: #6b7280; font-size: 13pt; margin-bottom: 24px; }
    .rule { border-top: 2px solid #e5e7eb; margin: 20px 0; }
    .intro p { margin: 0 0 8px; }
    .meta { margin: 16px 0; font-size: 10pt; }
    .notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 9.5pt; color: #475569; }
    .notes li { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9.5pt; }
    th { background: #1b5e20; color: #fff; text-align: left; padding: 8px 10px; }
    td { border-bottom: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    .num { width: 28px; text-align: center; font-weight: 700; color: #1b5e20; }
    .desc { color: #64748b; font-size: 9pt; }
    .module { width: 22%; font-size: 8.5pt; color: #0c4a6e; }
    .price { width: 16%; font-weight: 700; color: #1b5e20; white-space: nowrap; }
    .note { font-size: 8.5pt; color: #64748b; }
    .total-row td { background: #ecfdf5; font-weight: 700; border-top: 2px solid #1b5e20; }
    .bundles { page-break-before: always; }
    .terms { page-break-before: always; font-size: 9.5pt; }
    .terms ul { padding-left: 18px; }
    .sign { margin-top: 28px; }
    .sign p { margin: 12px 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <section class="cover">
    <div class="brand">Upgrade Proposal</div>
    <h1>Missing Features</h1>
    <div class="subtitle">Hospital Management System — Fixed Price List</div>
    <div class="rule"></div>
    <div class="intro">
      <p>This document lists <strong>standard HMS capabilities not present</strong> in your current system.</p>
      <p>Your base HMS was delivered at <strong>${BASELINE_SYSTEM_COST}</strong>. All prices below are <strong>fixed</strong> — select only the modules you need.</p>
    </div>
    <div class="meta"><strong>Prepared for:</strong> Hospital Client &nbsp;·&nbsp; <strong>Date:</strong> July 2026</div>
    <ul class="notes">
      <li>All prices in Philippine Peso (PHP); third-party API/hosting fees not included unless agreed.</li>
      <li><strong>Full catalog value:</strong> ${formatPhp(CATALOG_TOTAL)} (all 24 features).</li>
      <li><strong>Payment terms:</strong> 50% upon approval, 50% upon UAT sign-off.</li>
    </ul>
  </section>

  <section>
    <h2>Feature Catalog — Fixed Price List</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Feature &amp; Description</th>
          <th>Module</th>
          <th>Fixed Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3">Full catalog (all 24 features)</td>
          <td class="price">${formatPhp(CATALOG_TOTAL)}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="bundles">
    <h2>Recommended Fixed-Price Bundles</h2>
    <table>
      <thead>
        <tr>
          <th>Bundle</th>
          <th>Fixed Price</th>
          <th>Savings</th>
        </tr>
      </thead>
      <tbody>${bundleRows}</tbody>
    </table>
  </section>

  <section class="terms">
    <h2>Terms &amp; Conditions (Summary)</h2>
    <ul>
      <li>Scope covers software development and integration into the existing HMS codebase.</li>
      <li>Hardware, internet, SMS credits, payment gateway fees, and cloud hosting are client-provided unless agreed.</li>
      <li>Timeline: simple modules ~1-2 weeks; major modules ~3-6 weeks each.</li>
      <li>Quoted fixed prices are valid for 30 days from proposal date.</li>
      <li>Warranty: 30-day defect fix per delivered feature after go-live.</li>
    </ul>
    <div class="sign">
      <p><strong>Client Representative:</strong> _________________________________ &nbsp;&nbsp; Date: ______________</p>
      <p><strong>Service Provider:</strong> _____________________________________ &nbsp;&nbsp; Date: ______________</p>
    </div>
  </section>
</body>
</html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await buildPdf();
  await writeFile(OUT_HTML, buildHtml(), "utf8");
  console.log("Wrote", OUT_HTML);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
