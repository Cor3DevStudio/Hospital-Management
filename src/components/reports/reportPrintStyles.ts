/** Print CSS for report preview content (#report-print-area). */
export function getReportPrintCss(): string {
  return `
    #report-print-area {
      position: absolute;
      left: -9999px;
      top: 0;
      width: 210mm;
    }
    @media print {
      body * {
        visibility: hidden !important;
      }
      #report-print-area,
      #report-print-area * {
        visibility: visible !important;
      }
      #report-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        padding: 12mm !important;
        background: white !important;
        color: black !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `;
}
