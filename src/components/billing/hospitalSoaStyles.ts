/** Screen + print styles for hospital Statement of Account (A4). */
export function getHospitalSoaCss() {
  return `
    .hospital-soa-sheet {
      width: 210mm;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.3;
    }
    .hospital-soa-page {
      padding: 8mm 10mm 10mm;
      box-sizing: border-box;
    }
    .hospital-soa-header {
      display: grid;
      grid-template-columns: 1fr 1.4fr 1fr;
      gap: 8px;
      align-items: start;
      margin-bottom: 6px;
    }
    .hospital-soa-header__brand {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hospital-soa-header__logo {
      width: 36px;
      height: 36px;
      border: 2px solid #333;
      border-radius: 50%;
      flex-shrink: 0;
      background: linear-gradient(135deg, #e8f4fc 0%, #fff 50%, #e8f4fc 100%);
    }
    .hospital-soa-header__name {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      line-height: 1.2;
      margin: 0;
    }
    .hospital-soa-header__center {
      text-align: center;
      font-size: 9px;
      line-height: 1.35;
    }
    .hospital-soa-header__center p {
      margin: 0;
    }
    .hospital-soa-header__ref {
      text-align: right;
      font-size: 9px;
      margin: 0;
    }
    .hospital-soa-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin: 10px 0 12px;
    }
    .hospital-soa-field {
      display: flex;
      gap: 4px;
      align-items: baseline;
      min-width: 0;
      margin-bottom: 4px;
    }
    .hospital-soa-field__label {
      flex-shrink: 0;
      font-size: 9px;
      font-weight: 600;
    }
    .hospital-soa-field__value {
      flex: 1;
      border-bottom: 1px solid #000;
      font-size: 9px;
      min-height: 14px;
      padding-bottom: 1px;
      word-break: break-word;
    }
    .hospital-soa-field__value--block {
      display: block;
      width: 100%;
      margin-top: 2px;
    }
    .hospital-soa-patient__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 16px;
    }
    .hospital-soa-patient__block {
      margin: 6px 0;
    }
    .hospital-soa-patient__block-label {
      font-size: 9px;
      font-weight: 600;
      margin: 0 0 2px;
    }
    .hospital-soa-diagnosis-list {
      margin: 0;
      padding-left: 18px;
      font-size: 9px;
    }
    .hospital-soa-diagnosis-list li {
      margin-bottom: 2px;
    }
    .hospital-soa-fees__title {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      margin: 10px 0 4px;
    }
    .hospital-soa-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8.5px;
    }
    .hospital-soa-table th,
    .hospital-soa-table td {
      border: 1px solid #000;
      padding: 3px 4px;
      vertical-align: middle;
    }
    .hospital-soa-table th {
      font-weight: 700;
      text-align: center;
      background: #fff;
    }
    .hospital-soa-table__particulars {
      width: 28%;
      text-align: left !important;
      font-weight: 600;
    }
    .hospital-soa-table__detail {
      font-weight: 400;
    }
    .hospital-soa-table__money {
      text-align: right;
      white-space: nowrap;
    }
    .hospital-soa-table__section td {
      font-weight: 700;
      background: #f5f5f5;
    }
    .hospital-soa-table__subtotal td {
      font-weight: 700;
    }
    .hospital-soa-table__total td {
      font-weight: 700;
      font-size: 9px;
    }
    .hospital-soa-table__highlight td {
      background: #e8d4f0;
    }
    .hospital-soa-table__please-check {
      width: 14%;
      vertical-align: top;
    }
    .hospital-soa-table__please-check-label {
      display: block;
      margin-bottom: 2px;
    }
    .hospital-soa-table__discount-check {
      text-align: center;
      padding: 2px;
    }
    .hospital-soa-checks {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1px;
      font-size: 7px;
      line-height: 1.2;
    }
    .hospital-soa-checks__item {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .hospital-soa-checks__box {
      display: inline-flex;
      width: 9px;
      height: 9px;
      border: 1px solid #000;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      line-height: 1;
      flex-shrink: 0;
    }
    .hospital-soa-table__agency-discount {
      display: block;
      text-align: right;
      font-weight: 700;
    }
    .hospital-soa-phic-summary {
      margin-top: 10px;
      font-size: 8.5px;
    }
    .hospital-soa-phic-summary__title {
      margin: 0 0 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .hospital-soa-phic-summary__table {
      width: 55%;
      margin-left: auto;
      border-collapse: collapse;
    }
    .hospital-soa-phic-summary__table th,
    .hospital-soa-phic-summary__table td {
      padding: 2px 4px;
      text-align: right;
      border-bottom: 1px solid #ccc;
    }
    .hospital-soa-phic-summary__table th {
      font-weight: 600;
      text-align: left;
    }
    .hospital-soa-phic-summary__excess th,
    .hospital-soa-phic-summary__excess td {
      font-weight: 700;
    }
    .hospital-soa-phic-summary__balance th,
    .hospital-soa-phic-summary__balance td {
      font-weight: 800;
      border-top: 1px solid #000;
      border-bottom: 2px solid #000;
    }
    .hospital-soa-footer {
      margin-top: 12px;
      font-size: 9px;
    }
    .hospital-soa-footer__name {
      border-bottom: 1px solid #000;
      padding: 0 24px 1px;
    }
    @media print {
      .hospital-soa-sheet {
        width: 210mm;
      }
      .hospital-soa-page {
        padding: 6mm 8mm;
      }
    }
  `;
}
