import type { Admission, Patient } from "@/lib/store";
import { useStore } from "@/lib/store";
import { PatientClinicalHistory } from "./PatientClinicalHistory";
import { PatientSearchWithHistory } from "./PatientSearchWithHistory";

type PatientHistoryPanelProps = {
  patient: Patient | undefined;
  admissions: Admission[];
  onViewAdmission: (admissionId: string) => void;
};

export function PatientHistoryPanel({ patient, admissions, onViewAdmission }: PatientHistoryPanelProps) {
  const { state } = useStore();
  return (
    <PatientClinicalHistory
      state={state}
      patient={patient}
      admissions={admissions}
      onViewAdmission={onViewAdmission}
      compact
    />
  );
}

export { PatientClinicalHistory } from "./PatientClinicalHistory";
export { PatientSearchWithHistory } from "./PatientSearchWithHistory";
export { PatientSearchModal } from "./PatientSearchModal";
export { PatientSearch } from "./PatientSearch";
