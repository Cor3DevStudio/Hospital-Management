import type { Bill, Patient } from "@/lib/store";
import { buildCf1FormData, type Cf1FormData } from "@/components/philhealth/buildCf1Values";
import {
  CfOfficialHeader,
  Check,
  DigitBoxes,
  Label,
  LineField,
  PartBar,
  Row,
} from "@/components/philhealth/cfFormFields";

export type OfficialCF1SheetProps = {
  bill: Bill;
  patient: Patient | undefined;
};

/**
 * PhilHealth CF-1 (Claim Form 1, Revised September 2018).
 * Shared claim-form template; member / dependent context.
 */
export function OfficialCF1Sheet({ bill, patient }: OfficialCF1SheetProps) {
  const d = buildCf1FormData({ bill, patient });

  return (
    <div className="cf-sheet mx-auto bg-white text-black">
      <CfOfficialHeader formCode="CF-1" formTitle="(Claim Form 1)" />

      <div className="cf-sheet__body">
        <PartBar>PART I - MEMBER INFORMATION</PartBar>

        <Row>
          <Label>1. PhilHealth Identification Number (PIN) of Member:</Label>
          <DigitBoxes chars={d.memPin} groups={[2, 9, 1]} />
        </Row>

        <div className="cf-grid cf-grid--name-dob">
          <div>
            <Label>2. Name of Member:</Label>
            <div className="cf-grid cf-grid--4">
              <LineField label="Last Name" value={d.memLastName} />
              <LineField label="First Name" value={d.memFirstName} />
              <LineField label="Name Extension (JR/SR/III)" value={d.memNameExt} />
              <LineField label="Middle Name" value={d.memMiddleName} />
            </div>
          </div>
          <div>
            <Label>3. Date of Birth:</Label>
            <DigitBoxes chars={d.memDob} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
          </div>
        </div>

        <div className="cf-grid cf-grid--addr-sex">
          <div>
            <Label>4. Mailing Address:</Label>
            <div className="cf-grid cf-grid--5">
              <LineField label="Unit/Room No." value={d.memUnit} />
              <LineField label="Building Name" value={d.memBuilding} />
              <LineField label="Lot/Blk" value={d.memLotBlk} />
              <LineField label="Street" value={d.memStreet} />
              <LineField label="Subdivision" value={d.memSubdivision} />
            </div>
            <div className="cf-grid cf-grid--5 mt-2">
              <LineField label="Barangay" value={d.memBarangay} />
              <LineField label="City/Municipality" value={d.memCity} />
              <LineField label="Province" value={d.memProvince} />
              <LineField label="Country" value={d.memCountry} />
              <LineField label="Zip Code" value={d.memZip} />
            </div>
          </div>
          <div>
            <Label>5. Sex:</Label>
            <div className="cf-checks">
              <Check label="Male" checked={d.memSexMale} />
              <Check label="Female" checked={d.memSexFemale} />
            </div>
          </div>
        </div>

        <div className="mt-2">
          <Label>6. Contact Information:</Label>
          <div className="cf-grid cf-grid--3">
            <LineField label="Landline No." value={d.memLandline} />
            <LineField label="Mobile No." value={d.memMobile} />
            <LineField label="Email Address" value={d.memEmail} />
          </div>
        </div>

        <div className="cf-patient-member mt-2">
          <Label>7. Patient is the member?</Label>
          <div className="cf-checks">
            <Check label="Yes, Proceed to Part III" checked={d.patientIsMember} />
            <Check label="No, Proceed to Part II" checked={!d.patientIsMember} />
          </div>
        </div>

        <PartBar>
          PART II - PATIENT INFORMATION{" "}
          <span className="cf-part-note">
            (To be filled-out only if the patient is a dependent)
          </span>
        </PartBar>

        <DependentBlock d={d} />

        <PartBar>PART III - MEMBER CERTIFICATION</PartBar>

        <p className="cf-attest">
          Under the penalty of law, I attest that the information I provided in this Form are true
          and accurate to the best of my knowledge.
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
              <DigitBoxes
                chars={Array(8).fill("")}
                groups={[2, 2, 4]}
                labels={["month", "day", "year"]}
              />
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
              <DigitBoxes
                chars={Array(8).fill("")}
                groups={[2, 2, 4]}
                labels={["month", "day", "year"]}
              />
            </div>
          </div>
        </div>

        <PartBar>
          PART IV - EMPLOYER&apos;S CERTIFICATION{" "}
          <span className="cf-part-note">(for employed members only)</span>
        </PartBar>

        <Row>
          <Label>1. PhilHealth Employer Number (PEN):</Label>
          <DigitBoxes chars={Array(12).fill("")} groups={[2, 9, 1]} />
        </Row>
        <div className="cf-grid cf-grid--2 mt-2">
          <LineField label="2. Contact No." value="" />
          <LineField label="3. Business Name of Employer" value="" />
        </div>
        <p className="cf-employer-cert">
          4. CERTIFICATION OF EMPLOYER: &quot;This is to certify that the member&apos;s
          contributions prior to the first day of confinement have been deducted and remitted, or
          will be remitted on or before the due date; and that the information supplied by the
          member or his/her representative are consistent with our existing records.&quot;
        </p>
        <div className="cf-grid cf-grid--sig mt-2">
          <LineField
            label="Signature Over Printed Name of Employer/Authorized Representative"
            value=""
          />
          <LineField label="Official Capacity/Designation" value="" />
        </div>

        <PartBar>PART V - FOR PHILHEALTH USE ONLY</PartBar>
        <div className="cf-phic-use">
          <div>
            <span className="cf-mini-label">Date Received</span>
            <div className="cf-phic-box">LHIO</div>
            <div className="cf-phic-box">PRO</div>
          </div>
          <div>
            <span className="cf-mini-label">By:</span>
            <div className="cf-phic-box cf-phic-box--wide">
              LHIO/PRO Signature Over Printed Name
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DependentBlock({ d }: { d: Cf1FormData }) {
  return (
    <>
      <Row>
        <Label>1. PhilHealth Identification Number (PIN) of Dependent:</Label>
        <DigitBoxes chars={d.patPin} groups={[2, 9, 1]} />
      </Row>

      <div className="cf-grid cf-grid--name-dob">
        <div>
          <Label>2. Name of Patient:</Label>
          <div className="cf-grid cf-grid--4">
            <LineField label="Last Name" value={d.patLastName} />
            <LineField label="First Name" value={d.patFirstName} />
            <LineField label="Name Extension (JR/SR/III)" value={d.patNameExt} />
            <LineField label="Middle Name" value={d.patMiddleName} />
          </div>
        </div>
        <div>
          <Label>3. Date of Birth:</Label>
          <DigitBoxes chars={d.patDob} groups={[2, 2, 4]} labels={["month", "day", "year"]} />
        </div>
      </div>

      <div className="cf-grid cf-grid--rel-sex mt-2">
        <div>
          <Label>4. Relationship to Member:</Label>
          <div className="cf-checks">
            <Check label="Child" checked={d.patRelChild} />
            <Check label="Parent" checked={d.patRelParent} />
            <Check label="Spouse" checked={d.patRelSpouse} />
          </div>
        </div>
        <div>
          <Label>5. Sex:</Label>
          <div className="cf-checks">
            <Check label="Male" checked={d.patSexMale} />
            <Check label="Female" checked={d.patSexFemale} />
          </div>
        </div>
      </div>
    </>
  );
}
