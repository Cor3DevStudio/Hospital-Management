import { getPatientChartSheetCss } from "@/components/clinical/patientChartStyles";

/** Print CSS for patient medical chart (#patient-chart-print-area). */
export function getPatientChartPrintCss(): string {
  return `
    ${getPatientChartSheetCss()}
    #patient-chart-print-area {
      display: none;
    }
    @media print {
      body > #root > *,
      body > #root > div:not(#patient-chart-print-area),
      header,
      aside,
      .h-\\[calc\\(100vh-3rem\\)\\],
      .no-print {
        display: none !important;
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
        width: 210mm !important;
        max-width: 210mm !important;
        background: white !important;
        color: black !important;
        padding: 0 !important;
        margin: 0 !important;
        pointer-events: auto !important;
      }
      #patient-chart-print-area .patient-chart-page {
        break-after: page;
        page-break-after: always;
        box-shadow: none !important;
        border: none !important;
      }
      #patient-chart-print-area .patient-chart-page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
    }
  `;
}

function runPatientChartPrint(): void {
  const previousTitle = document.title;
  document.title = "Patient Medical Chart";
  const restoreTitle = () => {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };
  window.addEventListener("afterprint", restoreTitle);
  window.print();
}

export function triggerPatientChartPrint(): void {
  setTimeout(runPatientChartPrint, 200);
}

export function triggerPatientChartSavePdf(): void {
  triggerPatientChartPrint();
}
