import { memo, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Patient } from "@/lib/store";

export type PatientSearchProps = {
  patients: Patient[];
  selectedPatientId: string;
  onSelect: (id: string) => void;
  label?: string;
  showArchived?: boolean;
  /** Render without outer Card — for embedding inside forms/dialogs. */
  embedded?: boolean;
  /**
   * `table` — wide multi-column results (default).
   * `list` — stacked rows for narrow side panels (avoids clipped columns).
   */
  layout?: "table" | "list";
  /** Max rows shown in results table. */
  maxResults?: number;
  className?: string;
};

export function filterPatients(
  patients: Patient[],
  query: string,
  showArchived = false
): Patient[] {
  const lowerQuery = query.trim().toLowerCase();
  return patients
    .filter((patient) => showArchived || !patient.archived)
    .filter((patient) => {
      const fullName =
        `${patient.firstName} ${patient.middleName ?? ""} ${patient.lastName} ${patient.suffix ?? ""}`.trim().toLowerCase();
      return (
        !lowerQuery ||
        patient.id.toLowerCase().includes(lowerQuery) ||
        fullName.includes(lowerQuery) ||
        patient.contactNumber.toLowerCase().includes(lowerQuery) ||
        patient.email?.toLowerCase().includes(lowerQuery) ||
        patient.philhealth.memberNumber?.toLowerCase().includes(lowerQuery)
      );
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
}

function patientFullName(patient: Patient) {
  return `${patient.lastName}, ${patient.firstName}${patient.middleName ? ` ${patient.middleName}` : ""}${patient.suffix ? ` ${patient.suffix}` : ""}`;
}

export const PatientSearch = memo(function PatientSearch({
  patients,
  selectedPatientId,
  onSelect,
  label = "Patient Search",
  showArchived = false,
  embedded = false,
  layout = "table",
  maxResults = 15,
  className,
}: PatientSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterPatients(patients, query, showArchived),
    [patients, query, showArchived]
  );

  const results = filtered.slice(0, maxResults);

  const resultsList = (
    <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
      {results.map((patient) => {
        const fullName = patientFullName(patient);
        const selected = patient.id === selectedPatientId;
        return (
          <button
            key={patient.id}
            type="button"
            onClick={() => onSelect(patient.id)}
            className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted ${selected ? "bg-muted" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1 font-medium text-sm leading-snug break-words">{fullName}</span>
              <span
                className={`shrink-0 rounded-full border px-1.5 py-0 text-[10px] font-medium ${
                  patient.archived
                    ? "border-warning/30 bg-warning/15 text-warning-foreground"
                    : "border-success/20 bg-success/15 text-success"
                }`}
              >
                {patient.archived ? "Archived" : "Active"}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {patient.id}
              {patient.contactNumber ? ` · ${patient.contactNumber}` : ""}
            </span>
          </button>
        );
      })}
      {filtered.length === 0 && (
        <p className="px-3 py-4 text-center text-xs text-muted-foreground">No patients match your search.</p>
      )}
    </div>
  );

  const resultsTable = (
    <div className="max-h-56 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-3">Patient ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right pr-3">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((patient) => {
            const fullName = patientFullName(patient);
            return (
              <TableRow
                key={patient.id}
                className={`cursor-pointer ${patient.id === selectedPatientId ? "bg-slate-100" : "hover:bg-slate-50"}`}
                onClick={() => onSelect(patient.id)}
              >
                <TableCell className="pl-3 text-xs sm:text-sm font-medium whitespace-nowrap">{patient.id}</TableCell>
                <TableCell className="text-xs sm:text-sm min-w-0">{fullName}</TableCell>
                <TableCell className="text-xs sm:text-sm whitespace-nowrap">{patient.contactNumber}</TableCell>
                <TableCell className="text-right pr-3 text-xs sm:text-sm whitespace-nowrap">
                  {patient.archived ? "Archived" : "Active"}
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                No patients match your search.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  const body = (
    <div className={embedded ? `space-y-3 min-w-0 ${className ?? ""}` : "space-y-4 min-w-0"}>
      <div className="space-y-1 min-w-0">
        {!embedded && <Label className="text-xs text-muted-foreground">Search patient</Label>}
        {embedded && label && (
          <Label className="text-xs text-muted-foreground">{label}</Label>
        )}
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={layout === "list" ? "Name, ID, contact, or PIN…" : "Search by name, patient ID, contact, or PhilHealth PIN"}
          className="h-9 min-w-0"
        />
      </div>

      {layout === "list" ? resultsList : resultsTable}
    </div>
  );

  if (embedded) return body;

  return (
    <Card className={className}>
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">{body}</CardContent>
    </Card>
  );
});
