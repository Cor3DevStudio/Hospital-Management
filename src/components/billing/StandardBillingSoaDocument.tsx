import type { HospitalSoaModel, SoaAmountRow } from "@/components/billing/buildHospitalSoaModel";
import { formatSoaMoney } from "@/components/billing/buildHospitalSoaModel";
import { SoaOfficialHeader } from "@/components/billing/SoaOfficialHeader";
import type { SOAPrintOptions } from "@/components/billing/soaPrintOptions";
import { DEFAULT_SOA_PRINT_OPTIONS } from "@/components/billing/soaPrintOptions";

function moneyCell(value: number, blankIfZero = false) {
  if (blankIfZero && value === 0) return "—";
  if (value === 0) return "0.00";
  return formatSoaMoney(value);
}

function summaryCells(row: SoaAmountRow, blankPhilhealth = false) {
  const mandatory = row.discountScPwd + row.discountAgency;
  const phic = row.phicFirst + row.phicSecond;
  return (
    <>
      <td className="money">{moneyCell(row.actual)}</td>
      <td className="money">{mandatory > 0 ? moneyCell(mandatory) : "—"}</td>
      <td className="money">{moneyCell(phic, blankPhilhealth)}</td>
      <td className="money">—</td>
      <td className="money">{moneyCell(row.outOfPocket, blankPhilhealth)}</td>
    </>
  );
}

function PhicSummaryRow({ label, row }: { label: string; row: SoaAmountRow }) {
  const afterDiscount = Math.max(0, row.actual - row.discountScPwd - row.discountAgency);
  const afterPhic = Math.max(0, afterDiscount - row.phicFirst - row.phicSecond);
  return (
    <tr>
      <td className="particulars">{label}</td>
      <td className="money">{moneyCell(row.actual)}</td>
      <td className="money">{moneyCell(afterDiscount)}</td>
      <td className="money">{moneyCell(row.phicFirst)}</td>
      <td className="money">{moneyCell(row.phicSecond)}</td>
      <td className="money">{moneyCell(afterPhic)}</td>
    </tr>
  );
}

/** Standard billing SOA — matches Details only / Details & Summary reference layouts. */
export function StandardBillingSoaDocument({
  model,
  printOptions = DEFAULT_SOA_PRINT_OPTIONS,
}: {
  model: HospitalSoaModel;
  printOptions?: SOAPrintOptions;
}) {
  const showSummary = printOptions.viewMode !== "details";
  const showDetails = printOptions.viewMode !== "summary";
  const detailsTotal = model.itemizedLines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <article className="standard-billing-soa">
      <div className="standard-billing-soa__page">
        <SoaOfficialHeader model={model} />

        {showDetails ? (
          <section className="standard-billing-soa__section">
            <h2 className="standard-billing-soa__section-title">
              Detailed hospital charges-Internal
            </h2>
            <table className="standard-billing-soa__table standard-billing-soa__table--details">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ref. No</th>
                  <th className="money">Qty</th>
                  <th className="particulars">Particulars (Unit Price)</th>
                  <th className="money">Debit/s</th>
                  <th className="money">Discount/s</th>
                  <th className="money">Credit/s</th>
                  <th className="money">Balance</th>
                </tr>
              </thead>
              <tbody>
                {model.itemizedLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="particulars">
                      No itemized charges on record.
                    </td>
                  </tr>
                ) : (
                  model.itemizedLines.map((line, index) => (
                    <tr key={`${line.itemName}-${index}`}>
                      <td>{line.serviceDate}</td>
                      <td>{String(index + 1).padStart(4, "0")}</td>
                      <td className="money">{line.quantity}</td>
                      <td className="particulars">
                        {line.itemName} ({moneyCell(line.price)})
                      </td>
                      <td className="money">{moneyCell(line.amount)}</td>
                      <td className="money">—</td>
                      <td className="money">—</td>
                      <td className="money">{moneyCell(line.amount)}</td>
                    </tr>
                  ))
                )}
                <tr className="total">
                  <td colSpan={4} className="particulars">
                    Total Detailed hospital charges-Internal
                  </td>
                  <td className="money">{moneyCell(detailsTotal)}</td>
                  <td className="money">—</td>
                  <td className="money">—</td>
                  <td className="money">{moneyCell(detailsTotal)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {showSummary ? (
          <>
            <section className="standard-billing-soa__section">
              <h2 className="standard-billing-soa__section-title">SUMMARY OF FEES</h2>
              <table className="standard-billing-soa__table">
                <thead>
                  <tr>
                    <th className="particulars">Fee Particulars</th>
                    <th className="money">Amount</th>
                    <th className="money">Mandatory Discount</th>
                    <th className="money">PhilHealth</th>
                    <th className="money">Other Funding Sources</th>
                    <th className="money">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="standard-billing-soa__group-row">
                    <td colSpan={6} className="particulars">
                      HCI FEES
                    </td>
                  </tr>
                  {model.hciRows
                    .filter((row) => row.actual > 0)
                    .map((row) => (
                      <tr key={row.label}>
                        <td className="particulars">
                          {row.label}
                          {row.detail ? ` (${row.detail})` : ""}
                        </td>
                        {summaryCells(row, true)}
                      </tr>
                    ))}
                  <tr className="total">
                    <td className="particulars">SUBTOTAL (HCI fees)</td>
                    {summaryCells(model.hciSubtotal)}
                  </tr>

                  <tr className="standard-billing-soa__group-row">
                    <td colSpan={6} className="particulars">
                      PROFESSIONAL FEES
                    </td>
                  </tr>
                  {model.professionalFees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="particulars">
                        &nbsp;
                      </td>
                    </tr>
                  ) : (
                    model.professionalFees.map((pf) => (
                      <tr key={pf.name}>
                        <td className="particulars">
                          {pf.accreditation ? `${pf.accreditation} — ` : ""}
                          {pf.name}
                        </td>
                        <td className="money">{moneyCell(pf.row.actual)}</td>
                        <td className="money">—</td>
                        <td className="money">{moneyCell(pf.row.phicFirst, pf.row.phicFirst === 0)}</td>
                        <td className="money">—</td>
                        <td className="money">{moneyCell(pf.row.outOfPocket, pf.row.outOfPocket === 0)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="total">
                    <td className="particulars">SUBTOTAL (Professional fee/s)</td>
                    <td className="money">{moneyCell(model.pfSubtotal.actual)}</td>
                    <td className="money">—</td>
                    <td className="money">{moneyCell(model.pfSubtotal.phicFirst)}</td>
                    <td className="money">—</td>
                    <td className="money">{moneyCell(model.pfSubtotal.outOfPocket)}</td>
                  </tr>
                  <tr className="total">
                    <td className="particulars">TOTAL</td>
                    {summaryCells(model.total)}
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="standard-billing-soa__section">
              <h2 className="standard-billing-soa__section-title">SUMMARY OF CHARGES - PHIC</h2>
              <div className="standard-billing-soa__case-rates">
                <p>
                  <span className="standard-billing-soa__field-label">First Case Description:</span>{" "}
                  {model.firstCaseRate || "—"}
                </p>
                <p>
                  <span className="standard-billing-soa__field-label">Second Case Description:</span>{" "}
                  {model.secondCaseDescription || model.secondCaseRate || "—"}
                </p>
              </div>
              <table className="standard-billing-soa__table standard-billing-soa__table--phic">
                <thead>
                  <tr>
                    <th className="particulars">Particulars</th>
                    <th className="money">Actual Charges</th>
                    <th className="money">Amount after Discount</th>
                    <th className="money">First Case Rate Amount</th>
                    <th className="money">Second Case Rate Amount</th>
                    <th className="money">Amount after PhilHealth Deduction</th>
                  </tr>
                </thead>
                <tbody>
                  <PhicSummaryRow label="Hospital Fees" row={model.hciSubtotal} />
                  <PhicSummaryRow label="Professional Fees" row={model.pfSubtotal} />
                  <tr className="total">
                    <td className="particulars">TOTAL</td>
                    <td className="money">{moneyCell(model.total.actual)}</td>
                    <td className="money">
                      {moneyCell(
                        Math.max(
                          0,
                          model.total.actual - model.total.discountScPwd - model.total.discountAgency
                        )
                      )}
                    </td>
                    <td className="money">{moneyCell(model.total.phicFirst)}</td>
                    <td className="money">{moneyCell(model.total.phicSecond)}</td>
                    <td className="money">{moneyCell(model.total.outOfPocket)}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {model.phicCoverage ? (
              <table className="standard-billing-soa__table" style={{ marginTop: 8 }}>
                <tbody>
                  <tr>
                    <td className="particulars">
                      PhilHealth case rate ({model.phicCoverage.caseRateCode || "—"})
                    </td>
                    <td className="money">{moneyCell(model.phicCoverage.caseRateAmount)}</td>
                  </tr>
                  <tr>
                    <td className="particulars">HCI benefit (health facility)</td>
                    <td className="money">{moneyCell(model.phicCoverage.hciBenefit)}</td>
                  </tr>
                  <tr>
                    <td className="particulars">Professional fee benefit</td>
                    <td className="money">{moneyCell(model.phicCoverage.pfBenefit)}</td>
                  </tr>
                  <tr className="total">
                    <td className="particulars">Patient excess (not covered by PhilHealth)</td>
                    <td className="money">{moneyCell(model.phicCoverage.patientExcess)}</td>
                  </tr>
                  {model.phicCoverage.amountPaid > 0 ? (
                    <tr>
                      <td className="particulars">Amount paid</td>
                      <td className="money">{moneyCell(model.phicCoverage.amountPaid)}</td>
                    </tr>
                  ) : null}
                  <tr className="total">
                    <td className="particulars">Balance due</td>
                    <td className="money">{moneyCell(model.phicCoverage.balanceDue)}</td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </>
        ) : null}

        <footer className="standard-billing-soa__footer">
          <div>
            <p>Prepared by:</p>
            <div className="standard-billing-soa__sig-line" />
            <p className="standard-billing-soa__sig-label">Billing Clerk/Accountant</p>
            <p className="standard-billing-soa__sig-label">(Signature over printed name)</p>
            {model.preparedBy ? <p style={{ marginTop: 6 }}>{model.preparedBy}</p> : null}
            <p style={{ marginTop: 8 }}>Date Signed: ________________________</p>
            <p>Contact No: _________________________</p>
          </div>
          <div>
            <p>Conforme:</p>
            <div className="standard-billing-soa__sig-line" />
            <p className="standard-billing-soa__sig-label">Patient/Representative</p>
            <p className="standard-billing-soa__sig-label">(Signature over printed name)</p>
            <p style={{ marginTop: 8 }}>Relationship of representative to patient</p>
            <div className="standard-billing-soa__sig-line" />
            <p>Contact No.: _________________________________</p>
            <p style={{ marginTop: 8 }}>Date Signed: _________________________________</p>
          </div>
        </footer>
      </div>
    </article>
  );
}
