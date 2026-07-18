import type { Admission, AppState, HospitalInfo, Patient } from "@/lib/store";

import { buildAdmissionCoverSheetModel } from "@/components/clinical/buildAdmissionCoverSheetModel";

import { AdmissionCoverSheetDocument } from "@/components/clinical/AdmissionCoverSheetDocument";

export type AdmissionRecordDocumentProps = {
  hospital: HospitalInfo;

  admission: Admission;

  patient: Patient | undefined;

  state: AppState;

  preparedBy?: string;
};

/** Official Clinical Cover Sheet for inpatient admission (A4). */

export function AdmissionRecordDocument({
  hospital,

  admission,

  patient,

  state,

  preparedBy,
}: AdmissionRecordDocumentProps) {
  const model = buildAdmissionCoverSheetModel({
    hospital,

    admission,

    patient,

    state,

    preparedBy,
  });

  return <AdmissionCoverSheetDocument model={model} />;
}
