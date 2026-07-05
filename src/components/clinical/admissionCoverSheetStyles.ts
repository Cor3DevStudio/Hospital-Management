/** Screen + print styles for Admission Clinical Cover Sheet (A4). */
export function getAdmissionCoverSheetCss(): string {
  return `
    .admission-sheet {
      width: 210mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 6mm 8mm 8mm;
      box-sizing: border-box;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8px;
      line-height: 1.25;
    }
    .admission-sheet__header {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 8px;
      align-items: start;
      margin-bottom: 4px;
    }
    .admission-sheet__header-logo {
      width: 40px;
      height: 40px;
      border: 2px solid #000;
      border-radius: 50%;
      background: linear-gradient(135deg, #e8f4fc, #fff);
    }
    .admission-sheet__header-center {
      text-align: center;
      font-size: 9px;
    }
    .admission-sheet__header-center p {
      margin: 0;
    }
    .admission-sheet__hospital-name {
      font-weight: 700;
      font-size: 10px;
      margin: 2px 0 !important;
    }
    .admission-sheet__title {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      margin: 8px 0 6px;
      letter-spacing: 0.03em;
    }
    .admission-sheet__table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .admission-sheet__table td,
    .admission-sheet__table th {
      border: 1px solid #000;
      padding: 3px 4px;
      vertical-align: top;
    }
    .admission-sheet__th {
      font-weight: 700;
      text-align: left;
      background: #fff;
      font-size: 8px;
    }
    .admission-sheet__label {
      display: block;
      font-weight: 700;
      font-size: 7.5px;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .admission-sheet__value {
      display: block;
      font-size: 8.5px;
      min-height: 11px;
      word-break: break-word;
    }
    .admission-sheet__name-row .admission-sheet__value {
      font-size: 11px;
      font-weight: 700;
      min-height: 16px;
    }
    .admission-sheet__subhead td {
      font-size: 7px;
      color: #333;
      padding-top: 1px;
      padding-bottom: 4px;
    }
    .admission-sheet__checks-row {
      padding: 4px;
    }
    .admission-sheet__checks {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
      margin-top: 3px;
    }
    .admission-sheet__check {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 7.5px;
    }
    .admission-sheet__check-box {
      width: 9px;
      height: 9px;
      border: 1px solid #000;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      line-height: 1;
    }
    @media print {
      .admission-sheet {
        width: 210mm;
        padding: 4mm 6mm;
      }
    }
  `;
}
