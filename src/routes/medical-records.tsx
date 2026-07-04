import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import { PatientClinicalHistory } from "@/components/PatientClinicalHistory";
import { formatPatientName } from "@/lib/services/patientHistoryService";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/medical-records")({
  head: () => ({ meta: [{ title: "Medical Records — Hospital CMS" }] }),
  component: MedicalRecordsPage,
});

function MedicalRecordsPage() {
  const { state } = useStore();
  const [patientId, setPatientId] = useState("");
  const patient = state.patients.find((p) => p.id === patientId);

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader
        title="Medical Records"
        description="Consolidated patient history — admissions, ER, OPD, lab, radiology, and billing."
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <PatientSearchWithHistory
          patients={state.patients}
          selectedPatientId={patientId}
          onSelect={setPatientId}
          label="Search Patient History"
          showAdmissionHistory={false}
          showSelectedSummary={false}
          fullWidth={false}
          className="max-w-md"
        />
        {patient && (
          <p className="text-sm text-muted-foreground px-1">
            Viewing full clinical records for <strong>{formatPatientName(patient)}</strong>
          </p>
        )}
        <PatientClinicalHistory state={state} patient={patient} />
      </div>
    </div>
  );
}
