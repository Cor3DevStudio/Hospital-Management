import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Admission, Patient } from "@/lib/store";
import {
  formatPatientName,
  getPatientClinicalHistory,
  type ClinicalHistorySection,
} from "@/lib/services/patientHistoryService";
import type { AppState } from "@/lib/store";

type PatientClinicalHistoryProps = {
  state: AppState;
  patient: Patient | undefined;
  admissions?: Admission[];
  onViewAdmission?: (admissionId: string) => void;
  compact?: boolean;
  /** Stacked rows instead of a wide table (for narrow side panels). */
  listLayout?: boolean;
};

export function PatientClinicalHistory({
  state,
  patient,
  admissions,
  onViewAdmission,
  compact = false,
  listLayout = false,
}: PatientClinicalHistoryProps) {
  const patientId = patient?.id ?? "";
  const sections = useMemo(
    () => (patientId ? getPatientClinicalHistory(state, patientId) : []),
    [state, patientId]
  );
  const admissionItems =
    admissions?.map((a) => ({
      id: a.id,
      date: a.admissionDate,
      title: a.roomWard,
      detail: a.notes || a.attendingDoctor || "",
      status: a.status,
    })) ?? sections.find((s) => s.key === "admissions")?.items ?? [];

  if (!patient) {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Previous Admission History</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 text-xs text-muted-foreground">
          Select a patient to view their previous admission history.
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Previous Admission History</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="mb-2 text-sm font-semibold break-words">{formatPatientName(patient)}</p>
          {listLayout ? (
            <AdmissionList items={admissionItems} onViewAdmission={onViewAdmission} />
          ) : (
            <AdmissionTable items={admissionItems} onViewAdmission={onViewAdmission} />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base">Patient Clinical History</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm font-semibold">{formatPatientName(patient)}</p>
          <p className="text-xs text-muted-foreground">ID: {patient.id}</p>
        </CardContent>
      </Card>
      {sections.map((section) => (
        <HistorySection
          key={section.key}
          section={section}
          onViewAdmission={section.key === "admissions" ? onViewAdmission : undefined}
        />
      ))}
    </div>
  );
}

function AdmissionList({
  items,
  onViewAdmission,
}: {
  items: ClinicalHistorySection["items"];
  onViewAdmission?: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="py-2 text-center text-xs text-muted-foreground">No previous admissions found.</p>;
  }

  return (
    <ul className="max-h-40 space-y-2 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border px-2.5 py-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold whitespace-nowrap">{item.date}</span>
                {item.status && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    {item.status}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 font-medium break-words">{item.title || "—"}</p>
              {item.detail && (
                <p className="mt-0.5 text-muted-foreground line-clamp-2 break-words">{item.detail}</p>
              )}
            </div>
            {onViewAdmission && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={() => onViewAdmission(item.id)}
              >
                View
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdmissionTable({
  items,
  onViewAdmission,
}: {
  items: ClinicalHistorySection["items"];
  onViewAdmission?: (id: string) => void;
}) {
  const colSpan = onViewAdmission ? 5 : 4;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Ward</TableHead>
          <TableHead>Diagnosis</TableHead>
          <TableHead>Status</TableHead>
          {onViewAdmission && <TableHead className="text-right">Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="py-4 text-center text-xs text-muted-foreground">
              No previous admissions found.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-xs whitespace-nowrap">{item.date}</TableCell>
              <TableCell className="text-xs">{item.title}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{item.detail || "—"}</TableCell>
              <TableCell className="text-xs">{item.status}</TableCell>
              {onViewAdmission && (
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewAdmission(item.id)}>
                    View
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function HistorySection({
  section,
  onViewAdmission,
}: {
  section: ClinicalHistorySection;
  onViewAdmission?: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          {section.label}
          <Badge variant="outline" className="font-normal">{section.items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 border-t">
        {section.key === "admissions" && onViewAdmission ? (
          <div className="p-4">
            <AdmissionTable items={section.items} onViewAdmission={onViewAdmission} />
          </div>
        ) : (
          <Table>
            <TableBody>
              {section.items.length === 0 ? (
                <TableRow>
                  <TableCell className="py-6 text-center text-xs text-muted-foreground">No records yet</TableCell>
                </TableRow>
              ) : (
                section.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs w-28">{item.date}</TableCell>
                    <TableCell className="text-xs font-medium">{item.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.detail}</TableCell>
                    {item.status && (
                      <TableCell className="text-xs w-24">
                        <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Re-export for backward compatibility
export { PatientClinicalHistory as PatientHistoryPanel };
