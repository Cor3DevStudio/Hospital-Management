import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { buildCf4FormData } from "@/components/philhealth/buildCf4Values";
import {
  CfOfficialHeader,
  Check,
  DigitBoxes,
  Label,
  LineField,
  PartBar,
  Row,
} from "@/components/philhealth/cfFormFields";

export type OfficialCF4SheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  hospital: HospitalInfo;
  admission?: Admission;
};

/**
 * PhilHealth CF-4 (Claim Form 4 / Clinical Summary).
 * Same clean sheet template as CF-1 / CF-2.
 */
export function OfficialCF4Sheet({ bill, patient, hospital, admission }: OfficialCF4SheetProps) {
  const d = buildCf4FormData({ bill, patient, hospital, admission });
  const pinChars = d.patientPin.padEnd(12, " ").slice(0, 12).split("").map((c) => (c === " " ? "" : c));
  const accChars = d.hciAccreditation
    .replace(/\D/g, "")
    .padEnd(12, " ")
    .slice(0, 12)
    .split("")
    .map((c) => (c === " " ? "" : c));

  return (
    <div className="cf-sheet mx-auto bg-white text-black">
      <CfOfficialHeader formCode="CF-4" formTitle="(Claim Form 4)" />

      <div className="cf-sheet__body">
        <PartBar>I. HEALTH CARE INSTITUTION (HCI) INFORMATION</PartBar>

        <div className="cf-grid cf-grid--2">
          <LineField label="1. Name of HCI" value={d.hciName} />
          <div>
            <Label>2. Accreditation Number</Label>
            <DigitBoxes chars={accChars} groups={[2, 9, 1]} />
          </div>
        </div>
        <div className="mt-2">
          <LineField label="3. Address of HCI" value={d.hciAddress} />
        </div>

        <PartBar>II. PATIENT&apos;S DATA</PartBar>

        <div className="cf-grid cf-grid--name-dob">
          <div>
            <Label>1. Name of Patient</Label>
            <div className="cf-grid cf-grid--3">
              <LineField label="Last Name" value={d.patLast} />
              <LineField label="First Name" value={d.patFirst} />
              <LineField label="Middle Name" value={d.patMiddle} />
            </div>
          </div>
          <div>
            <Label>2. PIN</Label>
            <DigitBoxes chars={pinChars} groups={[2, 9, 1]} />
          </div>
        </div>

        <div className="cf-grid cf-grid--addr-sex mt-2">
          <LineField label="5. Chief Complaint" value={d.chiefComplaint} tall />
          <div>
            <LineField label="3. Age" value={d.patientAge} />
            <div className="mt-2">
              <Label>4. Sex</Label>
              <div className="cf-checks">
                <Check label="Male" checked={d.sexMale} />
                <Check label="Female" checked={d.sexFemale} />
              </div>
            </div>
          </div>
        </div>

        <div className="cf-grid cf-grid--3 mt-2">
          <LineField label="6. Admitting Diagnosis" value={d.admitDiagnosis} tall />
          <LineField label="7. Discharge Diagnosis" value={d.dischDiagnosis} tall />
          <div>
            <LineField label="8.a. 1st Case Rate Code" value={d.caseRate1} />
            <div className="mt-2">
              <LineField label="8.b. 2nd Case Rate Code" value={d.caseRate2} />
            </div>
          </div>
        </div>

        <div className="cf-grid cf-grid--2 mt-2">
          <LineField label="9.a. Date Admitted" value={d.admitDate} />
          <LineField label="10.a. Date Discharged" value={d.dischargeDate} />
        </div>

        <PartBar>III. REASON FOR ADMISSION</PartBar>

        <div className="mt-1">
          <Label>1. History of Present Illness</Label>
          <LineField label="History of Present Illness" value={d.historyIllness} tall />
        </div>
        <div className="mt-2">
          <Label>2.a. Pertinent Past Medical History</Label>
          <LineField label="Past Medical History" value={d.pastMedicalHistory} tall />
        </div>

        <div className="mt-2">
          <Label>4. Referred from another HCI?</Label>
          <div className="cf-checks">
            <Check label="No" checked={true} />
            <Check label="Yes" checked={false} />
          </div>
        </div>

        <div className="mt-2">
          <Label>5. Physical Examination on Admission</Label>
          <div className="cf-grid cf-grid--2">
            <LineField label="General Survey" value="" />
            <div className="cf-grid cf-grid--4">
              <LineField label="BP" value="" />
              <LineField label="HR" value="" />
              <LineField label="RR" value="" />
              <LineField label="Temp" value="" />
            </div>
          </div>
        </div>

        <PartBar>CERTIFICATION</PartBar>
        <p className="cf-attest">
          I certify that the information provided in this clinical summary is true and correct based
          on the patient&apos;s chart and health facility records.
        </p>
        <div className="cf-grid cf-grid--sig">
          <LineField
            label="Signature Over Printed Name of Attending Physician"
            value={d.physicianName}
            tall
          />
          <LineField label="Date Signed" value={d.dischargeDate} />
        </div>
      </div>
    </div>
  );
}
