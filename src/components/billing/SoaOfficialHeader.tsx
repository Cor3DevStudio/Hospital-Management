import type { HospitalSoaModel } from "@/components/billing/buildHospitalSoaModel";
import { formatPrintedAt } from "@/lib/forms/fillFormTemplate";

export function SoaOfficialHeader({ model }: { model: HospitalSoaModel }) {
  const billStatus = model.isTentative ? "TENTATIVE BILL" : "FINAL BILL";

  return (
    <>
      <header className="standard-billing-soa__letterhead">
        <p className="standard-billing-soa__republic">Republic of the Philippines</p>
        <p className="standard-billing-soa__hospital-name">{model.hospitalName}</p>
        <p className="standard-billing-soa__hospital-address">{model.hospitalAddress}</p>
        {model.hospitalCity ? (
          <p className="standard-billing-soa__hospital-address">{model.hospitalCity}</p>
        ) : null}
        {model.hospitalPhone ? (
          <p className="standard-billing-soa__hospital-address">{model.hospitalPhone}</p>
        ) : null}
      </header>

      <div className="standard-billing-soa__title-row">
        <h1 className="standard-billing-soa__title">STATEMENT OF ACCOUNT</h1>
        <div className="standard-billing-soa__title-meta">
          <p>
            <strong>{billStatus}</strong>
          </p>
          <p className="standard-billing-soa__ref">
            SOA Ref. No: <strong>{model.soaReference}</strong>
          </p>
          <p className="standard-billing-soa__ref">Printed: {model.printedAt}</p>
        </div>
      </div>

      <p className="standard-billing-soa__patient-type">{model.patientType || "—"}</p>

      <div className="standard-billing-soa__patient-grid">
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Name of Patient:</span>
          <span className="standard-billing-soa__field-value">{model.patientName}</span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Account No.:</span>
          <span className="standard-billing-soa__field-value">{model.accountNumber}</span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Address:</span>
          <span className="standard-billing-soa__field-value">{model.address}</span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Ward / Room:</span>
          <span className="standard-billing-soa__field-value">{model.wardRoom || "—"}</span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Date/Time Admitted:</span>
          <span className="standard-billing-soa__field-value">{model.admitDateTime}</span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Age:</span>
          <span className="standard-billing-soa__field-value">
            {model.ageYears || model.age} yrs., {model.ageMonths || "0"} mons.,{" "}
            {model.ageDays || "0"} days old
          </span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Date/Time Discharged:</span>
          <span className="standard-billing-soa__field-value">
            {model.dischargeDateTime || "—"}
          </span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">PHIC Membership:</span>
          <span className="standard-billing-soa__field-value">{model.phicMembership || "—"}</span>
        </div>
        <div className="standard-billing-soa__field">
          <span className="standard-billing-soa__field-label">Attending Physician:</span>
          <span className="standard-billing-soa__field-value">
            {model.attendingPhysician || "—"}
          </span>
        </div>
        <div className="standard-billing-soa__field standard-billing-soa__field--full">
          <span className="standard-billing-soa__field-label">Admitting Diagnosis:</span>
          <span className="standard-billing-soa__field-value">
            {model.admittingDiagnosis || "—"}
          </span>
        </div>
      </div>
    </>
  );
}

export function soaPrintedAtLabel(): string {
  return formatPrintedAt();
}
