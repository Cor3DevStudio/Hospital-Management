import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { buildCf5FormData } from "@/components/philhealth/buildCf5Values";
import {
  CfOfficialHeader,
  Check,
  DigitBoxes,
  Label,
  LineField,
  PartBar,
  Row,
} from "@/components/philhealth/cfFormFields";

export type OfficialCF5SheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  hospital: HospitalInfo;
  admission?: Admission;
};

/**
 * PhilHealth CF-5 (Claim Form 5 / DRG Information).
 * Same clean sheet template as CF-1 / CF-2.
 */
export function OfficialCF5Sheet({ bill, patient, hospital, admission }: OfficialCF5SheetProps) {
  const d = buildCf5FormData({ bill, patient, hospital, admission });
  const pinChars = d.patientPin
    .padEnd(12, " ")
    .slice(0, 12)
    .split("")
    .map((c) => (c === " " ? "" : c));
  const accChars = d.hciAccreditation
    .replace(/\D/g, "")
    .padEnd(12, " ")
    .slice(0, 12)
    .split("")
    .map((c) => (c === " " ? "" : c));

  return (
    <div className="cf-sheet mx-auto bg-white text-black">
      <CfOfficialHeader formCode="CF-5" formTitle="(Claim Form 5)" />

      <div className="cf-sheet__body">
        <div className="cf-grid cf-grid--2 mb-2">
          <LineField label="Name of Patient" value={d.patientName} />
          <div>
            <Label>PIN</Label>
            <DigitBoxes chars={pinChars} groups={[2, 9, 1]} />
          </div>
        </div>
        <div className="cf-grid cf-grid--2 mb-2">
          <LineField label="Name of Health Care Institution" value={d.hciName} />
          <div>
            <Label>Accreditation Number</Label>
            <DigitBoxes chars={accChars} groups={[2, 9, 1]} />
          </div>
        </div>

        <PartBar>PART I - DRG INFORMATION</PartBar>

        <div className="mt-1">
          <Label>1. Primary Diagnosis (PDx)</Label>
          <p className="cf-hint">Input only 1 valid ICD-10 code.</p>
          <LineField label="PDx (ICD-10)" value={d.pdx} />
        </div>

        <div className="mt-3">
          <Label>2. Second Diagnosis (SDx)</Label>
          <p className="cf-hint">Input up to 12 valid ICD-10 codes. No repeat codes.</p>
          <div className="cf-code-grid">
            {d.sdx.map((code, i) => (
              <LineField key={i} label={`SDx ${i + 1}`} value={code} />
            ))}
          </div>
        </div>

        <div className="mt-3">
          <Label>3. Applicable Procedure</Label>
          <p className="cf-hint">
            Input RVS codes. Indicate laterality (L / R / B) when applicable.
          </p>
          <div className="cf-code-grid cf-code-grid--rvs">
            {d.rvs.map((code, i) => (
              <div key={i} className="cf-rvs-cell">
                <LineField label={`RVS ${i + 1}`} value={code} />
                <div className="cf-checks cf-checks--compact">
                  <Check label="L" checked={false} />
                  <Check label="R" checked={false} />
                  <Check label="B" checked={false} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <Label>4. Newborn Data (if applicable)</Label>
          <Row>
            <span className="cf-label" style={{ marginBottom: 0 }}>
              Admission weight (up to 1 decimal):
            </span>
            <LineField label="kg" value={d.newbornWeight} />
          </Row>
        </div>

        <div className="mt-2">
          <LineField label="Case Rate / Package Code" value={d.caseRate} />
        </div>

        <PartBar>PART II - CONSENT TO ACCESS PATIENT RECORD/S</PartBar>
        <p className="cf-attest">
          I hereby consent to allowing PhilHealth to store the information provided on this form for
          research and policy purposes of the Corporation, and voluntarily and willingly give this
          consent in connection with this claim.
        </p>
        <div className="cf-grid cf-grid--sig">
          <LineField
            label="Signature Over Printed Name of Member/Patient/Authorized Representative"
            value={d.memberName}
            tall
          />
          <LineField label="Date Signed" value={d.signDate} />
        </div>

        <PartBar>PART III - CERTIFICATION OF HEALTH FACILITY</PartBar>
        <p className="cf-employer-cert">
          I hereby certify that services rendered were recorded in the patient&apos;s chart and
          health facility records and that the herein information given are true and correct.
        </p>
        <div className="cf-grid cf-grid--sig">
          <LineField
            label="Signature Over Printed Name of Attending Physician"
            value={d.physicianName}
            tall
          />
          <LineField label="Date Signed" value={d.signDate} />
        </div>
      </div>
    </div>
  );
}
