/** Print + screen styles for the official billing SOA layout (ESOA-style). */
export function getStandardBillingSoaCss() {
  return `
    .standard-billing-soa {
      width: 210mm;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
    }
    .standard-billing-soa__page {
      padding: 10mm 12mm 12mm;
      box-sizing: border-box;
    }
    .standard-billing-soa__title {
      text-align: center;
      font-size: 12pt;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.04em;
    }
    .standard-billing-soa__title-row {
      position: relative;
      margin: 10px 0 8px;
      text-align: center;
      min-height: 38px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .standard-billing-soa__title-meta {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      text-align: right;
      font-size: 8pt;
      line-height: 1.4;
    }
    .standard-billing-soa__title-meta p {
      margin: 0;
    }
    .standard-billing-soa__letterhead {
      text-align: center;
      margin-bottom: 8px;
    }
    .standard-billing-soa__republic {
      margin: 0;
      font-size: 8pt;
      font-style: italic;
    }
    .standard-billing-soa__patient-type {
      margin: 0 0 8px;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .standard-billing-soa__patient-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      margin-bottom: 14px;
      font-size: 9pt;
    }
    .standard-billing-soa__section {
      margin-bottom: 12px;
    }
    .standard-billing-soa__group-row td {
      font-weight: 700;
      background: #f3f3f3;
    }
    .standard-billing-soa__case-rates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
      margin-bottom: 6px;
      font-size: 8pt;
    }
    .standard-billing-soa__case-rates p {
      margin: 0;
    }
    .standard-billing-soa__table--details th,
    .standard-billing-soa__table--details td {
      font-size: 7.5pt;
    }
    .standard-billing-soa__table--phic th {
      font-size: 7pt;
      line-height: 1.2;
    }
    .standard-billing-soa__ref {
      text-align: right;
      font-size: 8pt;
      margin: 0;
    }
    .standard-billing-soa__hospital {
      text-align: center;
      margin-bottom: 12px;
    }
    .standard-billing-soa__hospital-name {
      font-weight: 700;
      margin: 0;
    }
    .standard-billing-soa__hospital-address {
      margin: 2px 0 0;
      font-size: 9pt;
    }
    .standard-billing-soa__field {
      display: flex;
      gap: 4px;
      align-items: baseline;
      min-width: 0;
    }
    .standard-billing-soa__field-label {
      flex-shrink: 0;
      width: 125px;
    }
    .standard-billing-soa__field-value {
      flex: 1;
      border-bottom: 1px solid #000;
      min-height: 14px;
    }
    .standard-billing-soa__field--full {
      grid-column: 1 / -1;
    }
    .standard-billing-soa__section-title {
      text-align: center;
      font-weight: 700;
      font-size: 9pt;
      margin: 12px 0 6px;
    }
    .standard-billing-soa__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 4px;
    }
    .standard-billing-soa__table th,
    .standard-billing-soa__table td {
      border: 1px solid #000;
      padding: 3px 4px;
      vertical-align: top;
    }
    .standard-billing-soa__table th {
      font-weight: 700;
      text-align: center;
      background: #f8f8f8;
    }
    .standard-billing-soa__table td.money,
    .standard-billing-soa__table th.money {
      text-align: right;
      white-space: nowrap;
    }
    .standard-billing-soa__table .particulars {
      text-align: left;
    }
    .standard-billing-soa__table tr.total td {
      font-weight: 700;
    }
    .standard-billing-soa__footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 20px;
      font-size: 9pt;
    }
    .standard-billing-soa__sig-line {
      border-bottom: 1px solid #000;
      height: 28px;
      margin: 8px 0 4px;
    }
    .standard-billing-soa__sig-label {
      font-size: 8pt;
      color: #333;
    }
    @media print {
      .standard-billing-soa {
        width: 210mm !important;
      }
      .standard-billing-soa__page {
        padding: 8mm 10mm !important;
      }
    }
  `;
}
