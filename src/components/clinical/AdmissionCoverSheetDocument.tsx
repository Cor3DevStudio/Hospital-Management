import type { ReactNode } from "react";
import type { AdmissionCoverSheetModel } from "@/components/clinical/buildAdmissionCoverSheetModel";

function Cell({
  label,
  value,
  colSpan,
  className,
}: {
  label?: string;
  value?: string;
  colSpan?: number;
  className?: string;
}) {
  return (
    <td colSpan={colSpan} className={className}>
      {label ? <span className="admission-sheet__label">{label}</span> : null}
      <span className="admission-sheet__value">{value || "\u00a0"}</span>
    </td>
  );
}

function HeaderCell({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <th colSpan={colSpan} className="admission-sheet__th">
      {children}
    </th>
  );
}

function CheckItem({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <span className="admission-sheet__check">
      <span className="admission-sheet__check-box">{checked ? "✓" : ""}</span>
      {label}
    </span>
  );
}

export function AdmissionCoverSheetDocument({ model }: { model: AdmissionCoverSheetModel }) {
  return (
    <article className="admission-sheet clinical-page">
      <header className="admission-sheet__header">
        <div className="admission-sheet__header-logo" aria-hidden />
        <div className="admission-sheet__header-center">
          <p>Republic of the Philippines</p>
          <p className="admission-sheet__hospital-name">{model.hospitalName}</p>
          <p>{model.hospitalAddress}</p>
          {model.hospitalPhone ? <p>{model.hospitalPhone}</p> : null}
        </div>
      </header>

      <h1 className="admission-sheet__title">CLINICAL COVER SHEET</h1>

      <table className="admission-sheet__table">
        <tbody>
          <tr>
            <Cell label="SR. CITIZEN NO.:" value={model.seniorCitizenNo} colSpan={2} />
            <Cell label="HOSPITAL NO.:" value={model.hospitalNo} colSpan={2} />
            <Cell label="HOSP. CODE:" value={model.hospitalCode} />
            <Cell label="OLD HEALTH REC. NO.:" value={model.oldHealthRecordNo} colSpan={2} />
            <Cell label="TYPE:" value={model.serviceType} />
          </tr>

          <tr>
            <HeaderCell colSpan={6}>PATIENT&apos;S NAME</HeaderCell>
            <HeaderCell colSpan={2}>WARD/ROOM/BED/SERVICE</HeaderCell>
          </tr>
          <tr className="admission-sheet__name-row">
            <Cell value={model.lastName} colSpan={2} className="admission-sheet__name-cell" />
            <Cell value={model.firstName} colSpan={2} className="admission-sheet__name-cell" />
            <Cell value={model.middleName} colSpan={2} className="admission-sheet__name-cell" />
            <Cell value={model.wardRoomBed} colSpan={2} />
          </tr>
          <tr className="admission-sheet__subhead">
            <td colSpan={2}>Last Name</td>
            <td colSpan={2}>First Name</td>
            <td colSpan={2}>Middle Name</td>
            <td colSpan={2}>
              <span className="admission-sheet__label">SERVICE:</span> {model.service}
            </td>
          </tr>

          <tr>
            <Cell label="PERMANENT ADDRESS" value={model.permanentAddress} colSpan={4} />
            <Cell label="TEL. NO./CP NO." value={model.contactNumber} colSpan={2} />
            <Cell label="SEX" value={model.sex} />
            <Cell label="CIVIL STATUS" value={model.civilStatus} />
          </tr>

          <tr>
            <Cell label="BIRTHDATE" value={model.birthDate} />
            <Cell label="AGE" value={model.age} />
            <Cell label="BIRTH PLACE" value={model.birthPlace} colSpan={2} />
            <Cell label="NATIONALITY" value={model.nationality} />
            <Cell label="RELIGION" value={model.religion} />
            <Cell label="OCCUPATION" value={model.occupation} />
            <Cell label="IF INDIGENOUS" value={model.indigenous} />
          </tr>

          <tr>
            <Cell label="EMPLOYER (Type of Business)" value={model.employer} colSpan={4} />
            <Cell label="ADDRESS" value="" colSpan={2} />
            <Cell label="TEL. NO./CP NO." value="" colSpan={2} />
          </tr>
          <tr>
            <Cell label="FATHER'S NAME" value={model.fatherName} colSpan={4} />
            <Cell label="ADDRESS" value="" colSpan={2} />
            <Cell label="TEL. NO./CP NO." value="" colSpan={2} />
          </tr>
          <tr>
            <Cell label="MOTHER'S MAIDEN NAME" value={model.motherName} colSpan={4} />
            <Cell label="ADDRESS" value="" colSpan={2} />
            <Cell label="TEL. NO./CP NO." value="" colSpan={2} />
          </tr>
          <tr>
            <Cell label="SPOUSE NAME" value={model.spouseName} colSpan={4} />
            <Cell label="ADDRESS" value="" colSpan={2} />
            <Cell label="TEL. NO./CP NO." value="" colSpan={2} />
          </tr>

          <tr>
            <td colSpan={2}>
              <span className="admission-sheet__label">ADMISSION DATE:</span>
              <div className="admission-sheet__value">{model.admissionDate}</div>
              <span className="admission-sheet__label">TIME:</span>
              <div className="admission-sheet__value">{model.admissionTime}</div>
              <span className="admission-sheet__label">ADMITTING CLERK</span>
              <div className="admission-sheet__value">{model.admittingClerk}</div>
            </td>
            <td colSpan={2}>
              <span className="admission-sheet__label">DISCHARGE DATE:</span>
              <div className="admission-sheet__value">{model.dischargeDate}</div>
              <span className="admission-sheet__label">TIME:</span>
              <div className="admission-sheet__value">{model.dischargeTime}</div>
            </td>
            <td>
              <span className="admission-sheet__label">TOTAL NO. OF DAYS</span>
              <div className="admission-sheet__value">{model.totalDays}</div>
            </td>
            <td colSpan={3}>
              <span className="admission-sheet__label">ADMITTING PHYSICIAN</span>
              <div className="admission-sheet__value">{model.admittingPhysician}</div>
              <span className="admission-sheet__label">ATTENDING PHYSICIAN</span>
              <div className="admission-sheet__value">{model.attendingPhysician}</div>
            </td>
          </tr>

          <tr>
            <Cell label="TYPE OF ADMISSION" value={model.admissionType} colSpan={4} />
            <Cell label="REFERRED BY" value={model.referredBy} colSpan={4} />
          </tr>

          <tr>
            <td colSpan={8} className="admission-sheet__checks-row">
              <span className="admission-sheet__label">SOCIAL SERVICE CLASSIFICATION:</span>
              <div className="admission-sheet__checks">
                <CheckItem label="A" />
                <CheckItem label="B" />
                <CheckItem label="C1" />
                <CheckItem label="C2" />
                <CheckItem label="C3" />
                <CheckItem label="D" />
              </div>
              {model.socialClassification ? (
                <span className="admission-sheet__value">{model.socialClassification}</span>
              ) : null}
            </td>
          </tr>

          <tr>
            <td colSpan={4}>
              <span className="admission-sheet__label">ALERT: ALLERGIC TO</span>
              <div className="admission-sheet__value">{model.allergicTo}</div>
              <span className="admission-sheet__label">HOSPITALIZATION PLAN</span>
              <div className="admission-sheet__value">{model.hospitalizationPlan}</div>
            </td>
            <td colSpan={4}>
              <span className="admission-sheet__label">HEALTH INSURANCE NAME / PHIC</span>
              <div className="admission-sheet__value">{model.phicMemberNo}</div>
              <div className="admission-sheet__checks">
                <CheckItem label="SSS Dependent" />
                <CheckItem label="SSS" />
                <CheckItem label="GSIS Dependent" />
                <CheckItem label="GSIS" checked={Boolean(model.phicMemberNo)} />
              </div>
              {model.phicCategory ? (
                <div className="admission-sheet__value">{model.phicCategory}</div>
              ) : null}
            </td>
          </tr>

          <tr>
            <Cell label="DATA FURNISHED BY" value={model.dataFurnishedBy} colSpan={3} />
            <Cell label="ADDRESS OF INFORMANT" value={model.informantAddress} colSpan={3} />
            <Cell label="RELATION TO PATIENT" value={model.relationToPatient} colSpan={2} />
          </tr>

          <tr>
            <Cell label="ADMISSION DIAGNOSIS:" value={model.admissionDiagnosis} colSpan={8} />
          </tr>

          <tr>
            <HeaderCell colSpan={6}>DISCHARGE DIAGNOSIS</HeaderCell>
            <HeaderCell colSpan={2}>ICD/RVU CODE:</HeaderCell>
          </tr>
          <tr>
            <Cell label="PRINCIPAL DIAGNOSIS:" value={model.principalDiagnosis} colSpan={8} />
          </tr>
          <tr>
            <Cell label="OTHER DIAGNOSIS:" value={model.otherDiagnosis} colSpan={8} />
          </tr>
          <tr>
            <Cell label="PRINCIPAL OPERATION/PROCEDURE:" value={model.principalOperation} colSpan={8} />
          </tr>
          <tr>
            <Cell label="OTHER OPERATION(S)/PROCEDURE(S):" value={model.otherOperations} colSpan={8} />
          </tr>
          <tr>
            <Cell label="ACCIDENT/INJURIES/POISONING:" value={model.accidentInjuries} colSpan={8} />
          </tr>

          <tr>
            <td colSpan={8} className="admission-sheet__checks-row">
              <span className="admission-sheet__label">DISPOSITION</span>
              <div className="admission-sheet__checks">
                <CheckItem label="Improved" checked={model.disposition === "Discharged"} />
                <CheckItem label="Transferred" checked={model.disposition === "Transferred"} />
                <CheckItem label="Admitted" checked={model.disposition === "Admitted"} />
                <CheckItem label="Pending" checked={model.disposition === "Pending"} />
                <CheckItem label="HAMA" />
                <CheckItem label="Expired" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
