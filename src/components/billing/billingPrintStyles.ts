/** Print CSS for official SOA.html layout (612pt × 936pt). Do not alter form geometry. */
export function getBillingPrintCss() {
  return `
    #print-area {
      display: none;
    }
    .soa-official-sheet__page > div,
    .esoa-official-sheet__page > div {
      margin: 0 auto !important;
    }
    @media print {
      body > #root > *,
      body > #root > div:not(#print-area),
      header,
      aside,
      .h-\\[calc\\(100vh-3rem\\)\\],
      .no-print {
        display: none !important;
      }
      body, html {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
        color: black !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #print-area {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: auto !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
      }
      .soa-official-sheet__page > div {
        border: none !important;
        margin: 0 !important;
      }
      @page {
        size: letter;
        margin: 0.25in;
      }
    }
  `;
}

/** Print CSS for official ESOA.html layout (A4 / 595.25pt × 841.85pt). */
export function getEsoaPrintCss() {
  return `
    #esoa-print-area {
      display: none;
    }
    @media print {
      body > #root > *,
      body > #root > div:not(#esoa-print-area),
      header,
      aside,
      .h-\\[calc\\(100vh-3rem\\)\\],
      .no-print {
        display: none !important;
      }
      body, html {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
        color: black !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #esoa-print-area {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: auto !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .esoa-official-sheet__page > div {
        border: none !important;
        margin: 0 !important;
      }
      @page {
        size: A4;
        margin: 0.2in;
      }
    }
  `;
}

/**
 * Print CSS for PhilHealth CF-1…CF-5 sheets.
 * Uses visibility (not display:none on ancestors) so only the form prints as PDF,
 * even when #cf-print-area is nested or a dialog/portal is open.
 */
export function getCf1PrintCss() {
  return `
    #cf-print-area,
    #cf1-print-area {
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
      #cf-print-area,
      #cf-print-area *,
      #cf1-print-area,
      #cf1-print-area * {
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
      #cf-print-area,
      #cf1-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        max-width: none !important;
        background: white !important;
        padding: 0 !important;
        margin: 0 !important;
        pointer-events: auto !important;
      }
      #cf-print-area .cf-sheet,
      #cf1-print-area .cf-sheet {
        max-width: none !important;
        width: 100% !important;
        border: none !important;
        box-shadow: none !important;
        margin: 0 auto !important;
      }
      #cf-print-area .cf3-official-sheet__page > div,
      #cf-print-area .cf4-official-sheet__page > div,
      #cf-print-area .cf5-official-sheet__page > div,
      #cf1-print-area .cf3-official-sheet__page > div,
      #cf1-print-area .cf4-official-sheet__page > div,
      #cf1-print-area .cf5-official-sheet__page > div {
        border: none !important;
        margin: 0 auto !important;
        box-shadow: none !important;
      }
      @page {
        size: A4;
        margin: 0.3in;
      }
    }
  `;
}
