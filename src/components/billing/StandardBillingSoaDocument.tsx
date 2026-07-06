import type { HospitalSoaModel, SoaAmountRow } from "@/components/billing/buildHospitalSoaModel";
import { formatSoaMoney } from "@/components/billing/buildHospitalSoaModel";

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

export function StandardBillingSoaDocument({ model }: { model: HospitalSoaModel }) {
  const diagnosis =
    model.finalDiagnoses.length > 0
      ? model.finalDiagnoses.join("; ")
      : model.admittingDiagnosis;

  return (
    <article className="standard-billing-soa">
      <div className="standard-billing-soa__page">
        <p className="standard-billing-soa__title">Statement of Account</p>
        <p className="standard-billing-soa__ref">
          SOA Reference No: <strong>{model.soaReference}</strong>
        </p>

        <div className="standard-billing-soa__hospital">
          <p className="standard-billing-soa__hospital-name">{model.hospitalName}</p>
          <p className="standard-billing-soa__hospital-address">{model.hospitalAddress}</p>
          {model.hospitalPhone ? (
            <p className="standard-billing-soa__hospital-address">{model.hospitalPhone}</p>
          ) : null}
        </div>

        <div className="standard-billing-soa__patient">
          <div className="standard-billing-soa__field">
            <span className="standard-billing-soa__field-label">Print Name:</span>
            <span className="standard-billing-soa__field-value">{model.patientName}</span>
          </div>
          <div className="standard-billing-soa__field">
            <span className="standard-billing-soa__field-label">Date and Time Admitted:</span>
            <span className="standard-billing-soa__field-value">{model.admitDateTime}</span>
          </div>
          <div className="standard-billing-soa__field">
            <span className="standard-billing-soa__field-label">Age:</span>
            <span className="standard-billing-soa__field-value">
              {model.ageYears || model.age} yrs., {model.ageMonths || " "} mons., {model.ageDays || " "} days old
            </span>
          </div>
          <div className="standard-billing-soa__field">
            <span className="standard-billing-soa__field-label">Date and Time Discharged:</span>
            <span className="standard-billing-soa__field-value">{model.dischargeDateTime}</span>
          </div>
          <div className="standard-billing-soa__field">
            <span className="standard-billing-soa__field-label">Address:</span>
            <span className="standard-billing-soa__field-value">{model.address}</span>
          </div>
          <div className="standard-billing-soa__field standard-billing-soa__field--full">
            <span className="standard-billing-soa__field-label">Final Diagnosis (ICD-10/RVS):</span>
            <span className="standard-billing-soa__field-value">{diagnosis}</span>
          </div>
        </div>

        <h2 className="standard-billing-soa__section-title">Summary of Fees</h2>
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
              <td className="particulars">Total</td>
              {summaryCells(model.hciSubtotal)}
            </tr>
          </tbody>
        </table>

        <h2 className="standard-billing-soa__section-title">Professional Fees</h2>
        <table className="standard-billing-soa__table">
          <thead>
            <tr>
              <th>Physician Accreditation Number</th>
              <th className="particulars">Physician Name</th>
              <th className="money">Amount</th>
              <th className="money">Discount</th>
              <th className="money">PhilHealth</th>
              <th className="money">Other Funding Sources</th>
              <th className="money">Balance</th>
            </tr>
          </thead>
          <tbody>
            {model.professionalFees.length === 0 ? (
              <tr>
                <td colSpan={7} className="particulars">
                  &nbsp;
                </td>
              </tr>
            ) : (
              model.professionalFees.map((pf) => (
                <tr key={pf.name}>
                  <td>—</td>
                  <td className="particulars">{pf.name}</td>
                  <td className="money">{moneyCell(pf.row.actual)}</td>
                  <td className="money">—</td>
                  <td className="money">{moneyCell(pf.row.phicFirst, pf.row.phicFirst === 0)}</td>
                  <td className="money">—</td>
                  <td className="money">{moneyCell(pf.row.outOfPocket, pf.row.outOfPocket === 0)}</td>
                </tr>
              ))
            )}
            <tr className="total">
              <td colSpan={2} className="particulars">
                Total
              </td>
              <td className="money">{moneyCell(model.pfSubtotal.actual)}</td>
              <td className="money">—</td>
              <td className="money">{moneyCell(model.pfSubtotal.phicFirst)}</td>
              <td className="money">—</td>
              <td className="money">{moneyCell(model.pfSubtotal.outOfPocket)}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="standard-billing-soa__section-title">Itemized Charges</h2>
        <table className="standard-billing-soa__table">
          <thead>
            <tr>
              <th>Service Date</th>
              <th className="particulars">Item Name</th>
              <th>Unit of Measurement</th>
              <th className="money">Price</th>
              <th className="money">Quantity</th>
              <th className="money">Amount</th>
            </tr>
          </thead>
          <tbody>
            {model.itemizedLines.map((line, index) => (
              <tr key={`${line.itemName}-${index}`}>
                <td>{line.serviceDate}</td>
                <td className="particulars">{line.itemName}</td>
                <td>{line.unit}</td>
                <td className="money">{moneyCell(line.price)}</td>
                <td className="money">{line.quantity}</td>
                <td className="money">{moneyCell(line.amount)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={5} className="particulars">
                Total
              </td>
              <td className="money">{moneyCell(model.total.actual)}</td>
            </tr>
          </tbody>
        </table>

        {model.phicCoverage ? (
          <table className="standard-billing-soa__table" style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <td className="particulars">PhilHealth case rate ({model.phicCoverage.caseRateCode || "—"})</td>
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
