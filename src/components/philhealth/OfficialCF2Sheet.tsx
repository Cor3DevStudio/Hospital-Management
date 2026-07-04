import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { buildCf2FormData } from "@/components/philhealth/buildCf2Values";
import {
  CfOfficialHeader,
  Check,
  DigitBoxes,
  Label,
  LineField,
  PartBar,
  Row,
} from "@/components/philhealth/cfFormFields";

export type OfficialCF2SheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  hospital: HospitalInfo;
  admission?: Admission;
};

/**
 * PhilHealth CF-2 (Claim Form 2, Revised September 2018).
 * Same sheet template/format as CF-1; content is confinement & charges.
 * Context from ClaimForm2_092018.
 */
export function OfficialCF2Sheet({ bill, patient, hospital, admission }: OfficialCF2SheetProps) {
  const d = buildCf2FormData({ bill, patient, hospital, admission });
  const pinChars = d.patientPin.padEnd(12, " ").slice(0, 12).split("").map((c) => (c === " " ? "" : c));

  return (
    <div className="cf-sheet mx-auto bg-white text-black">
      <CfOfficialHeader formCode="CF-2" formTitle="(Claim Form 2)" />

      <div className="cf-sheet__body">
        <PartBar>PART I - HEALTH CARE INSTITUTION (HCI) INFORMATION</PartBar>

        <Row>
          <Label>1. PhilHealth Accreditation Number:</Label>
          <DigitBoxes
            chars={d.hciAccreditation.replace(/\D/g, "").padEnd(12, " ").slice(0, 12).split("").map((c) => (c === " " ? "" : c))}
            groups={[2, 9, 1]}
          />
        </Row>
        <div className="cf-grid cf-grid--2">
          <LineField label="2. Name of Health Care Institution" value={d.hciName} />
          <LineField label="Contact No." value={d.hciPhone} />
        </div>
        <div className="mt-2">
          <LineField label="3. Address of Health Care Institution" value={d.hciAddress} />
        </div>

        <PartBar>PART II - PATIENT CONFINEMENT INFORMATION</PartBar>

        <div className="cf-grid cf-grid--name-dob">
          <div>
            <Label>1. Name of Patient:</Label>
            <LineField label="Last Name, First Name, Middle Name, Extension" value={d.patientName} />
          </div>
          <div>
            <Label>PIN:</Label>
            <DigitBoxes chars={pinChars} groups={[2, 9, 1]} />
            <div className="cf-grid cf-grid--2 mt-2">
              <LineField label="Age" value={d.patientAge} />
              <div>
                <Label>Sex:</Label>
                <div className="cf-checks">
                  <Check label="Male" checked={d.patientSexMale} />
                  <Check label="Female" checked={d.patientSexFemale} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <Label>2. Was patient referred by another Health Care Institution (HCI)?</Label>
          <div className="cf-checks">
            <Check label="Yes" checked={d.referredByOtherHci} />
            <Check label="No" checked={!d.referredByOtherHci} />
          </div>
        </div>

        <div className="mt-2">
          <Label>3. Confinement Period:</Label>
          <div className="cf-grid cf-grid--4">
            <LineField label="a. Date Admitted" value={d.dateAdmitted} />
            <LineField label="b. Time Admitted" value={d.timeAdmitted} />
            <LineField label="c. Date Discharge" value={d.dateDischarged} />
            <LineField label="d. Time Discharge" value={d.timeDischarged} />
          </div>
        </div>

        <div className="mt-2">
          <Label>4. Patient Disposition: (select only 1)</Label>
          <div className="cf-checks">
            <Check label="a. Improved" checked={d.dispositionImproved} />
            <Check label="b. Recovered" checked={d.dispositionRecovered} />
            <Check label="c. Home/Discharged Against Medical Advice" checked={d.dispositionHama} />
            <Check label="d. Absconded" checked={d.dispositionAbsconded} />
            <Check label="e. Expired" checked={d.dispositionExpired} />
            <Check label="f. Transferred/Referred" checked={d.dispositionTransferred} />
          </div>
        </div>

        <div className="mt-2">
          <Label>5. Type of Accommodation:</Label>
          <div className="cf-checks">
            <Check label="Private" checked={d.accommodationPrivate} />
            <Check label="Non-Private (Charity/Service)" checked={d.accommodationNonPrivate} />
          </div>
          {d.roomWard ? (
            <div className="mt-2">
              <LineField label="Room / Ward" value={d.roomWard} />
            </div>
          ) : null}
        </div>

        <div className="mt-2">
          <Label>6. Admission Diagnosis/es:</Label>
          <LineField label="Admission Diagnosis" value={d.admissionDiagnosis} tall />
        </div>

        <div className="mt-2">
          <Label>7. Discharge Diagnosis/es:</Label>
          <div className="cf-grid cf-grid--3">
            <LineField label="Diagnosis" value={d.dischargeDiagnosis} />
            <LineField label="ICD-10 Code/s" value={d.icd10} />
            <LineField label="RVS Code" value={d.rvsCode} />
          </div>
        </div>

        <div className="mt-2">
          <Label>8. Case Rate / Package Code:</Label>
          <LineField label="Case Rate Code" value={d.caseRateCode} />
        </div>

        <div className="mt-2">
          <Label>9. PhilHealth Benefits / Charges:</Label>
          <div className="cf-grid cf-grid--3">
            <LineField label="Total HCI Charges (₱)" value={d.totalCharges} />
            <LineField label="PhilHealth Benefit (₱)" value={d.philhealthBenefit} />
            <LineField label="Amount Paid (₱)" value={d.amountPaid} />
          </div>
        </div>

        <div className="mt-2">
          <Label>10. Accredited Health Care Professional:</Label>
          <LineField label="Name of Attending Physician / Date Signed" value={d.attendingDoctor} />
        </div>

        <PartBar>
          PART III - CERTIFICATION OF CONSUMPTION OF BENEFITS AND CONSENT TO ACCESS PATIENT
          RECORD/S
        </PartBar>
        <p className="cf-attest">
          I certify that the PhilHealth benefits for this confinement were applied to the hospital
          charges and professional fees, and I consent to PhilHealth&apos;s access to the patient
          record/s for claim processing.
        </p>
        <div className="cf-grid cf-grid--sig">
          <LineField label="Signature Over Printed Name of Member/Patient/Representative" value={d.patientName} tall />
          <LineField label="Date Signed" value="" />
        </div>

        <PartBar>PART IV - CERTIFICATION OF HEALTH CARE INSTITUTION</PartBar>
        <p className="cf-employer-cert">
          This is to certify that the information provided in this form is true and correct based on
          the records of this Health Care Institution, and that the services indicated were actually
          rendered to the patient.
        </p>
        <div className="cf-grid cf-grid--sig">
          <LineField label="Signature Over Printed Name of Authorized HCI Representative" value="" tall />
          <LineField label="Official Capacity / Designation" value="" />
        </div>
        <div className="mt-2">
          <LineField label="Name of Health Care Institution" value={d.hciName} />
        </div>
      </div>
    </div>
  );
}
