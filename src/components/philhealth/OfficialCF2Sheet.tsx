import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { buildCf2FormData, type Cf2FormData } from "@/components/philhealth/buildCf2Values";
import { mergeCf2FormData } from "@/lib/services/claimFormService";
import {
  CfOfficialHeader,
  DigitBoxes,
  EditableCheck,
  EditableLineField,
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
  editable?: boolean;
  overrides?: Partial<Cf2FormData>;
  onFieldChange?: (field: keyof Cf2FormData, value: string | boolean) => void;
};

/**
 * PhilHealth CF-2 (Claim Form 2, Revised September 2018).
 * Same sheet template/format as CF-1; content is confinement & charges.
 */
export function OfficialCF2Sheet({
  bill,
  patient,
  hospital,
  admission,
  editable,
  overrides,
  onFieldChange,
}: OfficialCF2SheetProps) {
  const d = mergeCf2FormData(buildCf2FormData({ bill, patient, hospital, admission }), overrides);
  const hasConsent = d.consentAccessRecords && d.consentReviewedSoa;
  const totalChargesVal = hasConsent ? d.totalCharges : "0.00";
  const benefitVal = hasConsent ? d.philhealthBenefit : "0.00";
  const amountPaidVal = hasConsent ? d.amountPaid : "0.00";
  const pinChars = d.patientPin.padEnd(12, " ").slice(0, 12).split("").map((c) => (c === " " ? "" : c));
  const field = (key: keyof Cf2FormData) => ({
    editable,
    onChange: onFieldChange
      ? (value: string) => onFieldChange(key, value)
      : undefined,
  });
  const check = (key: keyof Cf2FormData) => ({
    editable,
    onChange: onFieldChange
      ? (checked: boolean) => onFieldChange(key, checked)
      : undefined,
  });

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
          <EditableLineField label="2. Name of Health Care Institution" value={d.hciName} {...field("hciName")} />
          <EditableLineField label="Contact No." value={d.hciPhone} {...field("hciPhone")} />
        </div>
        <div className="mt-2">
          <EditableLineField label="3. Address of Health Care Institution" value={d.hciAddress} {...field("hciAddress")} />
        </div>

        <PartBar>PART II - PATIENT CONFINEMENT INFORMATION</PartBar>

        <div className="cf-grid cf-grid--name-dob">
          <div>
            <Label>1. Name of Patient:</Label>
            <EditableLineField label="Last Name, First Name, Middle Name, Extension" value={d.patientName} {...field("patientName")} />
          </div>
          <div>
            <Label>PIN:</Label>
            <DigitBoxes chars={pinChars} groups={[2, 9, 1]} />
            <div className="cf-grid cf-grid--2 mt-2">
              <EditableLineField label="Age" value={d.patientAge} {...field("patientAge")} />
              <div>
                <Label>Sex:</Label>
                <div className="cf-checks">
                  <EditableCheck label="Male" checked={d.patientSexMale} {...check("patientSexMale")} />
                  <EditableCheck label="Female" checked={d.patientSexFemale} {...check("patientSexFemale")} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <Label>2. Was patient referred by another Health Care Institution (HCI)?</Label>
          <div className="cf-checks">
            <EditableCheck
              label="Yes"
              checked={d.referredByOtherHci}
              editable={editable}
              onChange={
                onFieldChange ? (checked) => checked && onFieldChange("referredByOtherHci", true) : undefined
              }
            />
            <EditableCheck
              label="No"
              checked={!d.referredByOtherHci}
              editable={editable}
              onChange={
                onFieldChange ? (checked) => checked && onFieldChange("referredByOtherHci", false) : undefined
              }
            />
          </div>
        </div>

        <div className="mt-2">
          <Label>3. Confinement Period:</Label>
          <div className="cf-grid cf-grid--4">
            <EditableLineField label="a. Date Admitted" value={d.dateAdmitted} {...field("dateAdmitted")} />
            <EditableLineField label="b. Time Admitted" value={d.timeAdmitted} {...field("timeAdmitted")} />
            <EditableLineField label="c. Date Discharge" value={d.dateDischarged} {...field("dateDischarged")} />
            <EditableLineField label="d. Time Discharge" value={d.timeDischarged} {...field("timeDischarged")} />
          </div>
        </div>

        <div className="mt-2">
          <Label>4. Patient Disposition: (select only 1)</Label>
          <div className="cf-checks">
            <EditableCheck label="a. Improved" checked={d.dispositionImproved} {...check("dispositionImproved")} />
            <EditableCheck label="b. Recovered" checked={d.dispositionRecovered} {...check("dispositionRecovered")} />
            <EditableCheck label="c. Home/Discharged Against Medical Advice" checked={d.dispositionHama} {...check("dispositionHama")} />
            <EditableCheck label="d. Absconded" checked={d.dispositionAbsconded} {...check("dispositionAbsconded")} />
            <EditableCheck label="e. Expired" checked={d.dispositionExpired} {...check("dispositionExpired")} />
            <EditableCheck label="f. Transferred/Referred" checked={d.dispositionTransferred} {...check("dispositionTransferred")} />
          </div>
        </div>

        <div className="mt-2">
          <Label>5. Type of Accommodation:</Label>
          <div className="cf-checks">
            <EditableCheck label="Private" checked={d.accommodationPrivate} {...check("accommodationPrivate")} />
            <EditableCheck label="Non-Private (Charity/Service)" checked={d.accommodationNonPrivate} {...check("accommodationNonPrivate")} />
          </div>
          <div className="mt-2">
            <EditableLineField label="Room / Ward" value={d.roomWard} {...field("roomWard")} />
          </div>
        </div>

        <div className="mt-2">
          <Label>6. Admission Diagnosis/es:</Label>
          <EditableLineField label="Admission Diagnosis" value={d.admissionDiagnosis} tall {...field("admissionDiagnosis")} />
        </div>

        <div className="mt-2">
          <Label>7. Discharge Diagnosis/es:</Label>
          <div className="cf-grid cf-grid--3">
            <EditableLineField label="Diagnosis" value={d.dischargeDiagnosis} {...field("dischargeDiagnosis")} />
            <EditableLineField label="ICD-10 Code/s" value={d.icd10} {...field("icd10")} />
            <EditableLineField label="RVS Code" value={d.rvsCode} {...field("rvsCode")} />
          </div>
        </div>

        <div className="mt-2">
          <Label>8. Case Rate / Package Code:</Label>
          <EditableLineField label="Case Rate Code" value={d.caseRateCode} {...field("caseRateCode")} />
        </div>

        <div className="mt-2">
          <Label>9. PhilHealth Benefits / Charges:</Label>
          <div className="cf-grid cf-grid--3">
            <EditableLineField label="Total HCI Charges (₱)" value={totalChargesVal} {...field("totalCharges")} />
            <EditableLineField label="PhilHealth Benefit (₱)" value={benefitVal} {...field("philhealthBenefit")} />
            <EditableLineField label="Amount Paid (₱)" value={amountPaidVal} {...field("amountPaid")} />
          </div>
        </div>

        <div className="mt-2">
          <Label>10. Accredited Health Care Professional:</Label>
          <EditableLineField label="Name of Attending Physician / Date Signed" value={d.attendingDoctor} {...field("attendingDoctor")} />
        </div>

        <PartBar>
          PART III - CERTIFICATION OF CONSUMPTION OF BENEFITS AND CONSENT TO ACCESS PATIENT
          RECORD/S
        </PartBar>
        <div className="mt-2 space-y-1.5 border p-2.5 rounded bg-slate-50/50">
          <EditableCheck
            label="I certify that I am a PhilHealth member / authorized representative and consent to access patient record/s"
            checked={!!d.consentAccessRecords}
            {...check("consentAccessRecords")}
          />
          <EditableCheck
            label="I have reviewed the Statement of Account (SOA) / bill and certify its correctness"
            checked={!!d.consentReviewedSoa}
            {...check("consentReviewedSoa")}
          />
        </div>
        <p className="cf-attest">
          I certify that the PhilHealth benefits for this confinement were applied to the hospital
          charges and professional fees, and I consent to PhilHealth&apos;s access to the patient
          record/s for claim processing.
        </p>
        <div className="cf-grid cf-grid--sig">
          <EditableLineField label="Signature Over Printed Name of Member/Patient/Representative" value={d.patientName} tall {...field("patientName")} />
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
          <EditableLineField label="Name of Health Care Institution" value={d.hciName} {...field("hciName")} />
        </div>
      </div>
    </div>
  );
}
