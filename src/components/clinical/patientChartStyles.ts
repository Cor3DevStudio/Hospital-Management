/** Screen + print styles for Patient Medical Chart (A4). */
export function getPatientChartSheetCss(): string {
  return `
    .patient-chart-sheet {
      width: 210mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 8mm 10mm 10mm;
      box-sizing: border-box;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
    }
    .patient-chart-sheet__header {
      display: grid;
      grid-template-columns: 44px 1fr;
      gap: 10px;
      align-items: start;
      margin-bottom: 6px;
      padding-bottom: 8px;
      border-bottom: 1px solid #000;
    }
    .patient-chart-sheet__logo {
      width: 40px;
      height: 40px;
      border: 2px solid #1e3a5f;
      border-radius: 50%;
      background: linear-gradient(135deg, #e8f4fc 0%, #fff 55%, #e8f4fc 100%);
    }
    .patient-chart-sheet__header-text {
      text-align: center;
    }
    .patient-chart-sheet__header-text p {
      margin: 0;
    }
    .patient-chart-sheet__republic {
      font-size: 8pt;
      font-style: italic;
      color: #333;
    }
    .patient-chart-sheet__hospital {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-top: 2px !important;
    }
    .patient-chart-sheet__address {
      font-size: 8.5pt;
      color: #333;
      margin-top: 2px !important;
    }
    .patient-chart-sheet__accreditation {
      font-size: 8pt;
      font-weight: 600;
      margin-top: 3px !important;
    }
    .patient-chart-sheet__title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin: 10px 0 8px;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
    }
    .patient-chart-sheet__title {
      margin: 0;
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .patient-chart-sheet__subtitle {
      margin: 3px 0 0;
      font-size: 8.5pt;
      color: #444;
    }
    .patient-chart-sheet__meta {
      text-align: right;
      font-size: 8pt;
      line-height: 1.45;
    }
    .patient-chart-sheet__meta p {
      margin: 0;
    }
    .patient-chart-sheet__section {
      margin-top: 12px;
    }
    .patient-chart-sheet__section-title {
      margin: 0 0 6px;
      padding: 4px 6px;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #f0f4f8;
      border: 1px solid #000;
      border-bottom: none;
    }
    .patient-chart-sheet__table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8.5pt;
    }
    .patient-chart-sheet__table th,
    .patient-chart-sheet__table td {
      border: 1px solid #000;
      padding: 4px 5px;
      vertical-align: top;
      word-break: break-word;
    }
    .patient-chart-sheet__table th {
      font-weight: 700;
      background: #f8f8f8;
      text-align: left;
    }
    .patient-chart-sheet__label {
      display: block;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #444;
      margin-bottom: 2px;
    }
    .patient-chart-sheet__value {
      display: block;
      font-size: 9pt;
      min-height: 14px;
    }
    .patient-chart-sheet__value--name {
      font-size: 11pt;
      font-weight: 700;
    }
    .patient-chart-sheet__grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .patient-chart-sheet__empty {
      margin: 0;
      padding: 8px;
      border: 1px solid #ccc;
      border-top: none;
      font-size: 8.5pt;
      color: #555;
      font-style: italic;
      background: #fafafa;
    }
    .patient-chart-sheet__history-label {
      margin: 8px 0 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .patient-chart-sheet__footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #000;
      font-size: 8.5pt;
    }
    .patient-chart-sheet__sig-line {
      border-bottom: 1px solid #000;
      height: 28px;
      margin: 8px 0 4px;
    }
    .patient-chart-sheet__sig-label {
      font-size: 7.5pt;
      color: #444;
    }
    .patient-chart-sheet__confidential {
      margin-top: 10px;
      text-align: center;
      font-size: 7.5pt;
      color: #666;
      letter-spacing: 0.02em;
    }
    @media print {
      .patient-chart-sheet {
        width: 210mm !important;
        padding: 8mm 10mm !important;
      }
      .patient-chart-sheet__table th {
        background: #f0f0f0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .patient-chart-sheet__section-title {
        background: #f0f4f8 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}
