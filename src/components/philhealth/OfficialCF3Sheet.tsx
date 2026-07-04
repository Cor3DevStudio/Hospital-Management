import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { buildCf3FormData } from "@/components/philhealth/buildCf3Values";
import {
  CfOfficialHeader,
  Check,
  DigitBoxes,
  Label,
  LineField,
  PartBar,
  Row,
} from "@/components/philhealth/cfFormFields";

export type OfficialCF3SheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  hospital: HospitalInfo;
  admission?: Admission;
};

/**
 * PhilHealth CF-3 (Claim Form 3 / Patient's Clinical Record).
 * Same clean sheet template as CF-1 / CF-2 / CF-4 / CF-5.
 */
export function OfficialCF3Sheet({ bill, patient, hospital, admission }: OfficialCF3SheetProps) {
  const d = buildCf3FormData({ bill, patient, hospital, admission });
  const panChars = d.hciPan
    .replace(/\D/g, "")
    .padEnd(12, " ")
    .slice(0, 12)
    .split("")
    .map((c) => (c === " " ? "" : c));

  return (
    <div className="cf-sheet mx-auto bg-white text-black">
      <CfOfficialHeader formCode="CF-3" formTitle="(Claim Form 3)" />

      <div className="cf-sheet__body">
        <PartBar>PART I - PATIENT&apos;S CLINICAL RECORD</PartBar>

        <Row>
          <Label>1. PhilHealth Accreditation No. (PAN) — Institutional Health Care Provider:</Label>
          <DigitBoxes chars={panChars} groups={[2, 9, 1]} />
        </Row>

        <div className="cf-grid cf-grid--name-dob">
          <div>
            <Label>2. Name of Patient</Label>
            <LineField
              label="Last Name, First Name, Middle Name (e.g. Dela Cruz, Juan Jr., Sipag)"
              value={d.patientName}
            />
          </div>
          <div>
            <Label>3. Chief Complaint / Reason for Admission</Label>
            <LineField label="Chief Complaint" value={d.chiefComplaint} tall />
          </div>
        </div>

        <div className="cf-grid cf-grid--2 mt-2">
          <div>
            <Label>4. Date Admitted / Time Admitted</Label>
            <LineField label="Date Admitted (Month / Day / Year)" value={d.admitDate} />
          </div>
          <div>
            <Label>5. Date Discharged / Time Discharged</Label>
            <LineField label="Date Discharged (Month / Day / Year)" value={d.dischargeDate} />
          </div>
        </div>

        <div className="mt-2">
          <Label>6. Brief History of Present Illness / OB History</Label>
          <LineField label="History of Present Illness" value={d.historyIllness} tall />
        </div>

        <div className="mt-2">
          <Label>7. Physical Examination (Pertinent Findings per System)</Label>
          <div className="cf-grid cf-grid--2 mt-1">
            <LineField label="General Survey" value={d.generalSurvey} />
            <div className="cf-grid cf-grid--4">
              <LineField label="BP" value={d.vitalBp} />
              <LineField label="CR" value={d.vitalCr} />
              <LineField label="RR" value={d.vitalRr} />
              <LineField label="Temperature" value={d.vitalTemp} />
            </div>
          </div>
          <div className="cf-grid cf-grid--3 mt-2">
            <LineField label="HEENT" value={d.heent} />
            <LineField label="Chest / Lungs" value={d.chestLungs} />
            <LineField label="CVS" value={d.cvs} />
            <LineField label="Abdomen" value={d.abdomen} />
            <LineField label="GU (IE)" value={d.guIe} />
            <LineField label="Neuro Examination" value={d.neuro} />
          </div>
        </div>

        <div className="mt-2">
          <Label>8. Course in the Wards (attach additional sheets if necessary)</Label>
          <LineField label="Course in the Wards" value={d.courseInWards} tall />
        </div>

        <div className="mt-2">
          <Label>
            9. Pertinent Laboratory and Diagnostic Findings (CBC, Urinalysis, Fecalysis, X-ray,
            Biopsy, etc.)
          </Label>
          <LineField label="Laboratory / Diagnostic Findings" value={d.labFindings} tall />
        </div>

        <div className="mt-2">
          <Label>10. Disposition on Discharge</Label>
          <div className="cf-checks">
            <Check label="Improved" checked={d.dispImproved} />
            <Check label="Transferred" checked={d.dispTransferred} />
            <Check label="HAMA" checked={d.dispHama} />
            <Check label="Absconded" checked={d.dispAbsconded} />
            <Check label="Expired" checked={d.dispExpired} />
          </div>
        </div>

        <div className="cf-grid cf-grid--sig mt-3">
          <LineField
            label="Signature Over Printed Name of Attending Physician / Midwife"
            value={d.physicianName}
            tall
          />
          <LineField label="Date Signed (Month / Day / Year)" value={d.signDate} />
        </div>

        <PartBar>
          PART II - MATERNITY CARE PACKAGE{" "}
          <span className="cf-part-note">(accomplish only for MCP claims)</span>
        </PartBar>
        <p className="cf-hint">
          Prenatal consultation, obstetric / medical risk factors, delivery plan, birth outcome, and
          postpartum care — fill when applicable for Maternity Care Package claims.
        </p>
        <div className="cf-grid cf-grid--3">
          <LineField label="Initial Prenatal Consultation Date" value="" />
          <LineField label="LMP" value="" />
          <LineField label="Age of Menarche" value="" />
          <LineField label="Admitting Diagnosis (MCP)" value="" />
          <LineField label="Expected Date of Delivery" value="" />
          <LineField label="Date and Time of Delivery" value="" />
        </div>
      </div>
    </div>
  );
}
