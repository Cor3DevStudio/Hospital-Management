/** Print CSS for eClaims Monitoring registry & claim slip (#eclaims-print-area). */
export function getEclaimsPrintCss(): string {
  return `
    #eclaims-print-area {
      position: absolute;
      left: -9999px;
      top: 0;
      width: 210mm;
      pointer-events: none;
    }
    @media print {
      body * {
        visibility: hidden !important;
      }
      #eclaims-print-area,
      #eclaims-print-area * {
        visibility: visible !important;
      }
      .no-print,
      .no-print * {
        display: none !important;
        visibility: hidden !important;
      }
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
        color: black !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #eclaims-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        max-width: none !important;
        background: white !important;
        color: black !important;
        padding: 10mm 12mm !important;
        margin: 0 !important;
        pointer-events: auto !important;
      }
      #eclaims-print-area .eclaims-page {
        break-after: page;
        page-break-after: always;
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #eclaims-print-area .eclaims-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
    }
  `;
}
