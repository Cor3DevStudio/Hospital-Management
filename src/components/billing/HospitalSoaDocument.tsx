import type { HospitalSoaModel, SoaAmountRow } from "@/components/billing/buildHospitalSoaModel";
import { formatSoaMoney } from "@/components/billing/buildHospitalSoaModel";
import type { SOAPrintOptions } from "@/components/billing/soaPrintOptions";
import { DEFAULT_SOA_PRINT_OPTIONS } from "@/components/billing/soaPrintOptions";

function UnderlineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="hospital-soa-field">
      <span className="hospital-soa-field__label">{label}</span>
      <span className="hospital-soa-field__value">{value || "\u00a0"}</span>
    </div>
  );
}

function MoneyCell({ value, blankIfZero }: { value: number; blankIfZero?: boolean }) {
  if (blankIfZero && value === 0) {
    return <td className="hospital-soa-table__money">—</td>;
  }
  const text = value > 0 ? formatSoaMoney(value) : value === 0 ? "0.00" : "";
  return <td className="hospital-soa-table__money">{text}</td>;
}

function FeeRowCells({
  row,
  blankPhilhealthIfZero,
}: {
  row: SoaAmountRow;
  blankPhilhealthIfZero?: boolean;
}) {
  return (
    <>
      <MoneyCell value={row.actual} />
      <MoneyCell value={row.vatExempt} />
      <MoneyCell value={row.discountScPwd} />
      <td className="hospital-soa-table__discount-check" />
      <MoneyCell value={row.phicFirst} blankIfZero={blankPhilhealthIfZero} />
      <MoneyCell value={row.phicSecond} blankIfZero={blankPhilhealthIfZero} />
      <MoneyCell value={row.outOfPocket} blankIfZero={blankPhilhealthIfZero} />
    </>
  );
}

function DiscountCheckboxes({
  checks,
}: {
  checks: HospitalSoaModel["discountChecks"];
}) {
  const items = [
    { key: "pcsO", label: "PCSO" },
    { key: "dswd", label: "DSWD" },
    { key: "doh", label: "DOH" },
    { key: "hmo", label: "HMO" },
    { key: "others", label: "Others" },
  ] as const;

  return (
    <div className="hospital-soa-checks">
      {items.map(({ key, label }) => (
        <label key={key} className="hospital-soa-checks__item">
          <span className="hospital-soa-checks__box">{checks[key] ? "✓" : ""}</span>
          {label}
        </label>
      ))}
    </div>
  );
}

export function HospitalSoaDocument({
  model,
  printOptions = DEFAULT_SOA_PRINT_OPTIONS,
}: {
  model: HospitalSoaModel;
  printOptions?: SOAPrintOptions;
}) {
  const showSummary = printOptions.viewMode !== "details";
  const showDetails = printOptions.viewMode !== "summary";

  return (
    <article className="hospital-soa-page">
      <header className="hospital-soa-header">
        <div className="hospital-soa-header__brand">
          <div className="hospital-soa-header__logo" aria-hidden />
          <p className="hospital-soa-header__name">{model.hospitalName}</p>
        </div>
        <div className="hospital-soa-header__center">
          <p>{model.hospitalAddress}</p>
          {model.hospitalPhone ? <p>{model.hospitalPhone}</p> : null}
        </div>
        <p className="hospital-soa-header__ref">
          SOA Reference No: <strong>{model.soaReference}</strong>
        </p>
      </header>

      <h1 className="hospital-soa-title">STATEMENT OF ACCOUNT</h1>

      <section className="hospital-soa-patient">
        <div className="hospital-soa-patient__grid">
          <UnderlineField label="Name of Patient:" value={model.patientName} />
          <UnderlineField label="Age:" value={model.age} />
          <UnderlineField label="Date & Time Admitted:" value={model.admitDateTime} />
          <UnderlineField label="Address:" value={model.address} />
          <UnderlineField label="Date and Time Discharged:" value={model.dischargeDateTime} />
          <UnderlineField label="Admitting Diagnosis/es:" value={model.admittingDiagnosis} />
          <UnderlineField label="First Case Rate:" value={model.firstCaseRate} />
          <UnderlineField label="Second Case Rate:" value={model.secondCaseRate} />
        </div>
        <div className="hospital-soa-patient__block">
          <p className="hospital-soa-patient__block-label">Final Diagnosis/es and ICD Code/s:</p>
          {model.finalDiagnoses.length > 0 ? (
            <ol className="hospital-soa-diagnosis-list">
              {model.finalDiagnoses.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
          ) : (
            <p className="hospital-soa-field__value hospital-soa-field__value--block">&nbsp;</p>
          )}
        </div>
        <UnderlineField
          label="Surgical Procedure/s and RVS Code/s, if Applicable:"
          value={model.surgicalProcedures}
        />
      </section>

      <section className="hospital-soa-fees">
        {showSummary ? (
          <>
        <h2 className="hospital-soa-fees__title">SUMMARY OF FEES</h2>
        <table className="hospital-soa-table">
          <thead>
            <tr>
              <th rowSpan={2} className="hospital-soa-table__particulars">
                Particulars
              </th>
              <th rowSpan={2}>Actual Charges</th>
              <th rowSpan={2}>VAT exempt</th>
              <th colSpan={2}>Amount of Discounts</th>
              <th colSpan={2}>PhilHealth Benefits</th>
              <th rowSpan={2}>Out of Pocket of Patient</th>
            </tr>
            <tr>
              <th>Senior Citizen/PWD</th>
              <th className="hospital-soa-table__please-check">
                <span className="hospital-soa-table__please-check-label">Please Check</span>
                <DiscountCheckboxes checks={model.discountChecks} />
              </th>
              <th>First Case Rate Amount</th>
              <th>Second Case Rate Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hospital-soa-table__section">
              <td colSpan={8}>HCI fees</td>
            </tr>
            {model.hciRows.map((row) => (
              <tr key={row.label} className={row.highlight ? "hospital-soa-table__highlight" : undefined}>
                <td className="hospital-soa-table__particulars">
                  {row.label}
                  {row.detail ? (
                    <span className="hospital-soa-table__detail">
                      {" "}
                      {row.detail}
                    </span>
                  ) : null}
                </td>
                <FeeRowCells row={row} blankPhilhealthIfZero />
              </tr>
            ))}
            <tr className="hospital-soa-table__subtotal">
              <td className="hospital-soa-table__particulars">{model.hciSubtotal.label}</td>
              <FeeRowCells row={model.hciSubtotal} />
            </tr>

            <tr className="hospital-soa-table__section">
              <td colSpan={8}>Professional fee/s</td>
            </tr>
            {model.professionalFees.map((pf) => (
              <tr key={pf.name}>
                <td className="hospital-soa-table__particulars">{pf.name}</td>
                <FeeRowCells row={pf.row} blankPhilhealthIfZero />
              </tr>
            ))}
            <tr className="hospital-soa-table__subtotal">
              <td className="hospital-soa-table__particulars">{model.pfSubtotal.label}</td>
              <FeeRowCells row={model.pfSubtotal} />
            </tr>

            <tr className="hospital-soa-table__total">
              <td className="hospital-soa-table__particulars">TOTAL</td>
              <MoneyCell value={model.total.actual} />
              <MoneyCell value={model.total.vatExempt} />
              <MoneyCell value={model.total.discountScPwd} />
              <td
                className={`hospital-soa-table__discount-check${
                  model.total.discountAgency > 0 ? " hospital-soa-table__highlight" : ""
                }`}
              >
                {model.total.discountAgency > 0 ? (
                  <span className="hospital-soa-table__agency-discount">
                    {formatSoaMoney(model.total.discountAgency)}
                  </span>
                ) : null}
              </td>
              <MoneyCell value={model.total.phicFirst} />
              <MoneyCell value={model.total.phicSecond} />
              <MoneyCell value={model.total.outOfPocket} />
            </tr>
          </tbody>
        </table>
          </>
        ) : null}
      </section>

      {showDetails && model.itemizedLines.length > 0 ? (
        <section className="hospital-soa-fees">
          <h2 className="hospital-soa-fees__title">DETAILED HOSPITAL CHARGES</h2>
          <table className="hospital-soa-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="hospital-soa-table__particulars">Particulars</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {model.itemizedLines.map((line, index) => (
                <tr key={`${line.itemName}-${index}`}>
                  <td>{line.serviceDate}</td>
                  <td className="hospital-soa-table__particulars">{line.itemName}</td>
                  <td>{line.quantity}</td>
                  <MoneyCell value={line.price} />
                  <MoneyCell value={line.amount} />
                </tr>
              ))}
              <tr className="hospital-soa-table__total">
                <td colSpan={4} className="hospital-soa-table__particulars">
                  TOTAL
                </td>
                <MoneyCell value={model.total.actual} />
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {showSummary && model.phicCoverage ? (
        <section className="hospital-soa-phic-summary" aria-label="PhilHealth coverage summary">
          <h2 className="hospital-soa-phic-summary__title">PhilHealth Coverage Summary</h2>
          <table className="hospital-soa-phic-summary__table">
            <tbody>
              <tr>
                <th scope="row">Case rate ({model.phicCoverage.caseRateCode || "—"})</th>
                <td>{formatSoaMoney(model.phicCoverage.caseRateAmount)}</td>
              </tr>
              <tr>
                <th scope="row">HCI benefit (70%)</th>
                <td>{formatSoaMoney(model.phicCoverage.hciBenefit)}</td>
              </tr>
              <tr>
                <th scope="row">Professional fee benefit (30%)</th>
                <td>{formatSoaMoney(model.phicCoverage.pfBenefit)}</td>
              </tr>
              <tr>
                <th scope="row">Total PhilHealth coverage</th>
                <td>{formatSoaMoney(model.phicCoverage.totalBenefit)}</td>
              </tr>
              <tr>
                <th scope="row">Total actual charges</th>
                <td>{formatSoaMoney(model.phicCoverage.totalActual)}</td>
              </tr>
              <tr className="hospital-soa-phic-summary__excess">
                <th scope="row">Patient excess (not covered by PhilHealth)</th>
                <td>{formatSoaMoney(model.phicCoverage.patientExcess)}</td>
              </tr>
              {model.phicCoverage.amountPaid > 0 ? (
                <tr>
                  <th scope="row">Amount paid</th>
                  <td>{formatSoaMoney(model.phicCoverage.amountPaid)}</td>
                </tr>
              ) : null}
              <tr className="hospital-soa-phic-summary__balance">
                <th scope="row">Balance due</th>
                <td>{formatSoaMoney(model.phicCoverage.balanceDue)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}

      {model.preparedBy ? (
        <footer className="hospital-soa-footer">
          <p>
            Prepared by: <span className="hospital-soa-footer__name">{model.preparedBy}</span>
          </p>
        </footer>
      ) : null}
    </article>
  );
}
