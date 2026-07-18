import type { Admission, Bill, Patient } from "@/lib/store";
import { buildCsfFormData } from "@/components/philhealth/buildCsfValues";
import {
  CfOfficialHeader,
  Check,
  DigitBoxes,
  Label,
  LineField,
  PartBar,
  Row,
} from "@/components/philhealth/cfFormFields";

export type OfficialCSFSheetProps = {
  bill: Bill;
  patient: Patient | undefined;
  admission?: Admission;
};

/**
 * PhilHealth CSF (Claim Signature Form).
 * Uses the shared claim-form template so fields and labels align with CF-1/CF-2.
 */
export function OfficialCSFSheet({ bill, patient, admission }: OfficialCSFSheetProps) {
  const d = buildCsfFormData({ bill, patient, admission });
  const emptyDate = Array(8).fill("");

  return (
    <div className="cf-sheet mx-auto bg-white text-black">
      <CfOfficialHeader formCode="CSF" formTitle="(Claim Signature Form)" />

      <div className="cf-sheet__body">
        <PartBar>PART I - MEMBER AND PATIENT INFORMATION AND CERTIFICATION</PartBar>

        <Row>
          <Label>1. PhilHealth Identification Number (PIN) of Member:</Label>
          <DigitBoxes chars={d.memPin} groups={[2, 9, 1]} />
        </Row>

        <div className="cf-grid cf-grid--csf-name-dob">
          <div>
            <Label>2. Name of Member:</Label>
            <div className="cf-grid cf-grid--3">
              <LineField label="Last Name" value={d.memLastName} />
              <LineField label="First Name" value={d.memFirstName} />
              <LineField label="Middle Name" value={d.memMiddleName} />
            </div>
          </div>
          <div>
            <Label>3. Member Date of Birth:</Label>
            <DigitBoxes chars={d.memDob} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
          </div>
        </div>

        <Row>
          <Label>4. PhilHealth Identification Number (PIN) of Dependent:</Label>
          <DigitBoxes chars={d.patPin} groups={[2, 9, 1]} />
        </Row>

        <div className="cf-grid cf-grid--csf-patient">
          <div>
            <Label>5. Name of Patient:</Label>
            <div className="cf-grid cf-grid--3">
              <LineField label="Last Name" value={d.patLastName} />
              <LineField label="First Name" value={d.patFirstName} />
              <LineField label="Middle Name" value={d.patMiddleName} />
            </div>
          </div>
          <div>
            <Label>6. Relationship to Member:</Label>
            <div className="cf-checks cf-checks--compact">
              <Check label="Child" checked={d.patRelChild} />
              <Check label="Parent" checked={d.patRelParent} />
              <Check label="Spouse" checked={d.patRelSpouse} />
            </div>
          </div>
        </div>

        <div className="cf-grid cf-grid--confinement">
          <div>
            <Label>7. Confinement Period</Label>
            <div className="cf-grid cf-grid--2">
              <div>
                <span className="cf-mini-label">a. Date Admitted</span>
                <DigitBoxes
                  chars={d.admitDob}
                  groups={[2, 2, 4]}
                  labels={["month", "day", "year"]}
                />
              </div>
              <div>
                <span className="cf-mini-label">c. Date Discharged</span>
                <DigitBoxes
                  chars={d.dischargeDob}
                  groups={[2, 2, 4]}
                  labels={["month", "day", "year"]}
                />
              </div>
            </div>
          </div>
          <div>
            <Label>8. Patient Date of Birth:</Label>
            <DigitBoxes chars={d.patDob} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
          </div>
        </div>

        <p className="cf-attest">
          9. CERTIFICATION OF MEMBER: Under the penalty of law, I attest that the information I
          provided in this Form are true and accurate to the best of my knowledge.
        </p>

        <div className="cf-grid cf-grid--sig">
          <div>
            <LineField
              label="Signature Over Printed Name of Member"
              value={d.memSignatureName}
              tall
            />
            <div className="mt-2">
              <span className="cf-mini-label">Date Signed</span>
              <DigitBoxes chars={emptyDate} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
            </div>
          </div>
          <div>
            <LineField
              label="Signature Over Printed Name of Member's Representative"
              value=""
              tall
            />
            <div className="mt-2">
              <span className="cf-mini-label">Date Signed</span>
              <DigitBoxes chars={emptyDate} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
            </div>
          </div>
        </div>

        <p className="cf-hint">
          If member/representative is unable to write, put right thumbmark. Member/representative
          should be assisted by an HCI representative. Check the appropriate box:
        </p>
        <div className="cf-checks">
          <Check label="Member" checked={false} />
          <Check label="Representative" checked={false} />
        </div>

        <div className="cf-grid cf-grid--rep-reason mt-2">
          <div>
            <Label>Relationship of the representative to the member:</Label>
            <div className="cf-checks cf-checks--compact">
              <Check label="Spouse" checked={false} />
              <Check label="Child" checked={false} />
              <Check label="Parent" checked={false} />
              <Check label="Sibling" checked={false} />
              <Check label="Others, specify" checked={false} />
            </div>
            <LineField label="" value="" />
          </div>
          <div>
            <Label>Reason for signing on behalf of the member:</Label>
            <div className="cf-checks cf-checks--compact">
              <Check label="Member is incapacitated" checked={false} />
              <Check label="Other reasons" checked={false} />
            </div>
            <LineField label="" value="" />
          </div>
        </div>

        <PartBar>
          PART II - EMPLOYER&apos;S CERTIFICATION{" "}
          <span className="cf-part-note">(for employed members only)</span>
        </PartBar>

        <Row>
          <Label>1. PhilHealth Employer No. (PEN):</Label>
          <DigitBoxes chars={Array(12).fill("")} groups={[2, 9, 1]} />
        </Row>
        <div className="cf-grid cf-grid--2 mt-2">
          <LineField label="2. Contact No." value="" />
          <LineField label="3. Business Name of Employer" value="" />
        </div>
        <p className="cf-employer-cert">
          4. CERTIFICATION OF EMPLOYER: This is to certify that all monthly premium contributions
          for and in behalf of the member, while employed in this company, including the applicable
          three (3) monthly premium contributions within the past six (6) months period prior to the
          first day of this confinement, have been deducted/collected and remitted to PhilHealth,
          and that the information supplied by the member or his/her representative on Part I are
          consistent with our available records.
        </p>
        <div className="cf-grid cf-grid--sig mt-2">
          <LineField
            label="Signature Over Printed Name of Employer / Authorized Representative"
            value=""
            tall
          />
          <LineField label="Official Capacity / Designation" value="" />
        </div>
        <div className="mt-2">
          <span className="cf-mini-label">Date Signed</span>
          <DigitBoxes chars={emptyDate} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
        </div>

        <PartBar>PART III - CONSENT TO ACCESS PATIENT RECORD/S</PartBar>
        <p className="cf-attest">
          I hereby consent to the examination by PhilHealth of the patient&apos;s medical records
          for the purpose of verifying the veracity of this claim. I hereby hold PhilHealth or any
          of its officers, employees and/or representatives free from any and all liabilities
          relative to the herein-mentioned consent which I have voluntarily and willingly given in
          connection with this claim for reimbursement before PhilHealth.
        </p>
        <div className="cf-grid cf-grid--sig">
          <LineField
            label="Signature Over Printed Name of Member / Patient / Authorized Representative"
            value={d.patSignatureName}
            tall
          />
          <div>
            <span className="cf-mini-label">Date Signed</span>
            <DigitBoxes chars={emptyDate} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
          </div>
        </div>
        <div className="cf-grid cf-grid--rep-reason mt-2">
          <div>
            <Label>Relationship of the representative to the member/patient:</Label>
            <div className="cf-checks cf-checks--compact">
              <Check label="Parent" checked={false} />
              <Check label="Spouse" checked={false} />
              <Check label="Child" checked={false} />
              <Check label="Sibling" checked={false} />
              <Check label="Others, specify" checked={false} />
            </div>
            <LineField label="" value="" />
          </div>
          <div>
            <Label>Reason for signing on behalf of the member/patient:</Label>
            <div className="cf-checks cf-checks--compact">
              <Check label="Patient is incapacitated" checked={false} />
              <Check label="Other reasons" checked={false} />
            </div>
            <LineField label="" value="" />
          </div>
        </div>
        <p className="cf-hint">
          If patient/representative is unable to write, put right thumbmark. Patient/representative
          should be assisted by an HCI representative. Check the appropriate box:
        </p>
        <div className="cf-checks">
          <Check label="Patient" checked={false} />
          <Check label="Representative" checked={false} />
        </div>

        <PartBar>PART IV - HEALTH CARE PROFESSIONAL INFORMATION</PartBar>
        {d.attendingPhysicians.map((name, index) => (
          <div key={index} className="cf-hcp-row">
            <LineField label="Accreditation No." value="" />
            <LineField label="Signature Over Printed Name" value={name} tall />
            <div>
              <span className="cf-mini-label">Date Signed</span>
              <DigitBoxes chars={emptyDate} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
            </div>
          </div>
        ))}

        <PartBar>PART V - PROVIDER INFORMATION AND CERTIFICATION</PartBar>
        <p className="cf-employer-cert">
          I certify that services rendered were recorded in the patient&apos;s chart and health care
          institution records and that the herein information given are true and correct.
        </p>
        <div className="cf-grid cf-grid--sig">
          <LineField
            label="Signature Over Printed Name of Authorized HCI Representative"
            value={d.hciRepName}
            tall
          />
          <LineField label="Official Capacity / Designation" value="" />
        </div>
        <div className="mt-2">
          <span className="cf-mini-label">Date Signed</span>
          <DigitBoxes chars={emptyDate} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
        </div>
      </div>
    </div>
  );
}
