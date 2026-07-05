/** Print CSS for patient medical chart (#patient-chart-print-area). */
export function getPatientChartPrintCss(): string {
  return `
    #patient-chart-print-area {
      display: none;
    }
    @media print {
      body * {
        visibility: hidden !important;
      }
      #patient-chart-print-area,
      #patient-chart-print-area * {
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
      #patient-chart-print-area {
        display: block !important;
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
      #patient-chart-print-area .patient-chart-page {
        break-after: page;
        page-break-after: always;
      }
      #patient-chart-print-area .patient-chart-page:last-child {
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

export function triggerPatientChartPrint(): void {
  setTimeout(() => window.print(), 200);
}

export function triggerPatientChartSavePdf(): void {
  triggerPatientChartPrint();
}
