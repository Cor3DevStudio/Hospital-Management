import { getAdmissionCoverSheetCss } from "@/components/clinical/admissionCoverSheetStyles";

/** Print CSS for Admission, ER, and OPD clinical records (#clinical-print-area). */
export function getClinicalPrintCss(): string {
  return `
    ${getAdmissionCoverSheetCss()}
    #clinical-print-area {
      display: none;
    }
    @media print {
      body > #root > *,
      body > #root > div:not(#clinical-print-area),
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
      #clinical-print-area {
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
      #clinical-print-area .clinical-page,
      #clinical-print-area .admission-sheet {
        break-after: page;
        page-break-after: always;
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
      }
      #clinical-print-area .clinical-page:last-child,
      #clinical-print-area .admission-sheet:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
    }
  `;
}

export function triggerClinicalPrint(): void {
  setTimeout(() => window.print(), 200);
}

export function triggerClinicalSavePdf(): void {
  triggerClinicalPrint();
}
