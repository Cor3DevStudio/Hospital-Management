import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Archive, Save, RotateCcw, Printer, Trash2, Download } from "lucide-react";
import { validateAttachmentFile } from "@/lib/attachmentValidation";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList, useResetPageOnChange } from "@/lib/hooks/usePaginatedList";
import { buildAdmissionStatusMap, getAdmissionStatusFromMap } from "@/lib/stateIndexes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatChip } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import {
  archivePatient,
  computeAge,
  createPatient,
  deletePatient,
  filterPatients,
  formatRegisteredDate,
  getAdmissionStatus,
  isDuplicatePatient,
  restorePatient,
  updatePatient,
  type PatientFilter,
} from "@/lib/services/patientService";
import { useStore, todayISO, type Patient } from "@/lib/store";

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Patients — Hospital CMS" }] }),
  component: PatientsPage,
});

const emptyPatient = (): Patient => ({
  id: "",
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  birthDate: "",
  gender: "Male",
  civilStatus: "Single",
  contactNumber: "",
  email: "",
  address: { street: "", barangay: "", city: "", province: "", zip: "" },
  emergencyContact: { name: "", phone: "", relationship: "" },
  philhealth: { memberNumber: "", category: "Employed", memberType: "Member" },
  seniorCitizen: { flag: false, idNumber: "" },
  pwd: { flag: false, idNumber: "" },
  archived: false,
  createdAt: todayISO(),
});

const formatDateLong = (dateStr?: string) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

function PatientsPage() {
  const { state, setState, addAttachment, deleteAttachment, getAttachmentBlob } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientFilter>("active");
  const [form, setForm] = useState<Patient>(emptyPatient());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterPatients(state.patients, search, statusFilter),
    [state.patients, search, statusFilter]
  );

  const admissionStatusMap = useMemo(
    () => buildAdmissionStatusMap(state.admissions),
    [state.admissions]
  );

  const patientList = usePaginatedList(filtered, 50);
  useResetPageOnChange(patientList.resetPage, [search, statusFilter]);

  const selectedPatient = selectedId ? state.patients.find((p) => p.id === selectedId) : undefined;
  const patientConsultations = useMemo(
    () => state.consultations.filter((c) => c.patientId === selectedPatient?.id),
    [state.consultations, selectedPatient?.id]
  );
  const patientBills = useMemo(
    () => state.bills.filter((b) => b.patientId === selectedPatient?.id),
    [state.bills, selectedPatient?.id]
  );
  const patientAppointments = useMemo(
    () => state.appointments.filter((a) => a.patientId === selectedPatient?.id),
    [state.appointments, selectedPatient?.id]
  );
  const prescriptionEntries = useMemo(
    () => patientConsultations.flatMap((c) => c.prescriptions.map((p) => ({ ...p, consultationDate: c.date, diagnosis: c.diagnosis }))),
    [patientConsultations]
  );

  const total = state.patients.length;
  const active = state.patients.filter((p) => !p.archived).length;
  const archived = total - active;

  const isDuplicate = isDuplicatePatient(state.patients, form);

  const select = (p: Patient) => {
    setSelectedId(p.id);
    setForm({
      ...p,
      suffix: p.suffix || "",
      emergencyContact: {
        name: p.emergencyContact.name,
        phone: p.emergencyContact.phone,
        relationship: p.emergencyContact.relationship || "",
      },
      philhealth: {
        memberNumber: p.philhealth?.memberNumber || "",
        category: p.philhealth?.category || "Employed",
        memberType: p.philhealth?.memberType || "Member",
      },
      seniorCitizen: {
        flag: p.seniorCitizen?.flag || false,
        idNumber: p.seniorCitizen?.idNumber || "",
      },
      pwd: {
        flag: p.pwd?.flag || false,
        idNumber: p.pwd?.idNumber || "",
      },
    });
  };
  const reset = () => {
    setSelectedId(null);
    setForm(emptyPatient());
  };

  const save = () => {
    if (!form.firstName || !form.lastName) return toast.error("First name and Last name are required");
    if (isDuplicate) return toast.error("A patient with this name already exists");
    setState((s) => {
      const exists = s.patients.find((p) => p.id === form.id);
      return exists ? updatePatient(s, form) : createPatient(s, form);
    });
    toast.success(selectedId ? "Patient updated" : "Patient registered");
    reset();
  };
  const archive = () => {
    if (!selectedId) return;
    setState((s) => archivePatient(s, selectedId));
    toast.success("Patient archived");
    reset();
  };
  const restore = () => {
    if (!selectedId) return;
    setState((s) => restorePatient(s, selectedId));
    toast.success("Patient restored");
    reset();
  };
  const remove = () => {
    if (!selectedId) return;
    if (!confirm("Permanently delete this patient and unlink related records?")) return;
    setState((s) => deletePatient(s, selectedId));
    toast.success("Patient deleted");
    reset();
  };
  const handlePrintChart = () => {
    setTimeout(() => window.print(), 150);
  };

  const renderPatientChart = (isPrint = false) => {
    if (!selectedPatient) return null;

    const latestConsultation = patientConsultations[0];
    const latestAppointment = patientAppointments[0];
    const outstandingBills = patientBills.filter((b) => b.status !== "Paid").length;

    return (
      <div className={isPrint ? "space-y-6" : "rounded-lg border bg-slate-50 p-4 space-y-4"}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{isPrint ? "Patient Medical Chart" : "Medical Chart Viewer"}</h3>
            <p className="text-[11px] text-muted-foreground">
              {isPrint ? "Official clinical summary and record printout." : "Recent OPD visits, prescriptions, and billing activity for this patient."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className={`rounded-md border bg-white p-3 ${isPrint ? "border-slate-300" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Clinical Summary</p>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="font-medium">Patient:</span> {selectedPatient.firstName} {selectedPatient.lastName}</p>
              <p><span className="font-medium">Last OPD visit:</span> {latestConsultation ? `${formatDateLong(latestConsultation.date)} — ${latestConsultation.diagnosis}` : "No OPD visits yet"}</p>
              <p><span className="font-medium">Next appointment:</span> {latestAppointment ? `${formatDateLong(latestAppointment.date)} @ ${latestAppointment.time}` : "No upcoming appointment"}</p>
            </div>
          </div>

          <div className={`rounded-md border bg-white p-3 ${isPrint ? "border-slate-300" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Billing Snapshot</p>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="font-medium">Bills on record:</span> {patientBills.length}</p>
              <p><span className="font-medium">Outstanding:</span> {outstandingBills}</p>
              <p><span className="font-medium">Latest bill status:</span> {patientBills[0]?.status ?? "None"}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-md border bg-white p-3 ${isPrint ? "border-slate-300" : ""}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">OPD Visit History</p>
          <div className="mt-2 space-y-2">
            {patientConsultations.length > 0 ? patientConsultations.slice(0, 3).map((c) => (
              <div key={c.id} className="rounded border border-slate-200 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{formatDateLong(c.date)}</p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.discharged ? "Discharged" : "Active"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Chief complaint: {c.chiefComplaint}</p>
                <p className="text-xs"><span className="font-medium">Diagnosis:</span> {c.diagnosis}</p>
                <p className="text-xs"><span className="font-medium">Notes:</span> {c.notes}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No OPD visits have been recorded for this patient.</p>}
          </div>
        </div>

        <div className={`rounded-md border bg-white p-3 ${isPrint ? "border-slate-300" : ""}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Current Prescriptions</p>
          <div className="mt-2 space-y-2">
            {prescriptionEntries.length > 0 ? prescriptionEntries.slice(0, 6).map((p, index) => (
              <div key={`${p.consultationDate}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                <p className="font-medium">{p.medicine}</p>
                <p className="text-xs text-muted-foreground">{p.dosage} · {p.instructions}</p>
                <p className="text-[11px] text-slate-500">OPD visit date: {formatDateLong(p.consultationDate)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No prescriptions are on file for this patient.</p>}
          </div>
        </div>

        <div className={`rounded-md border bg-white p-3 ${isPrint ? "border-slate-300" : ""}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Attachments</p>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Input type="file" accept="application/pdf,application/xml,text/xml" onChange={async (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (!f) return;
                const validation = validateAttachmentFile(f);
                if (!validation.valid) {
                  return toast.error(validation.message);
                }
                if (!selectedPatient) return toast.error("No patient selected");
                try {
                  await addAttachment("patient", selectedPatient.id, f);
                  toast.success("Attachment uploaded");
                } catch (err) {
                  console.error(err);
                  toast.error(err instanceof Error ? err.message : "Failed to upload attachment");
                }
                (e.target as HTMLInputElement).value = "";
              }} />
            </div>

            <div className="space-y-2">
              {((state.attachments || []) as any).filter((a: any) => a.refType === "patient" && a.refId === selectedPatient.id).length === 0 && (
                <p className="text-sm text-muted-foreground">No documents attached.</p>
              )}
              {((state.attachments || []) as any).filter((a: any) => a.refType === "patient" && a.refId === selectedPatient.id).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded border p-2">
                  <div>
                    <div className="font-medium text-sm">{a.filename}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()} · {(a.size/1024).toFixed(1)} KB</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={async () => {
                      const blob = await getAttachmentBlob(a.key);
                      if (!blob) return toast.error("File not found");
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 30_000);
                    }}>Open</Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const blob = await getAttachmentBlob(a.key);
                      if (!blob) return toast.error("File not found");
                      const url = URL.createObjectURL(blob);
                      const el = document.createElement("a");
                      el.href = url;
                      el.download = a.filename || "document.pdf";
                      document.body.appendChild(el);
                      el.click();
                      el.remove();
                      URL.revokeObjectURL(url);
                    }}><Download className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm("Delete this attachment?")) return;
                      await deleteAttachment(a.id);
                      toast.success("Attachment removed");
                    }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        #print-area-patient-chart {
          display: none;
        }
        @media print {
          header,
          aside,
          .no-print {
            display: none !important;
          }
          body, html {
            background: white !important;
            color: black !important;
          }
          #print-area-patient-chart {
            display: block !important;
            padding: 16px;
          }
        }
      `}</style>
      <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background no-print">
      <PageHeader
        title="Patients"
        description="Register and manage patient demographics, insurance, and classifications."
        actions={
          <>
            <PatientSearchWithHistory
              patients={state.patients}
              selectedPatientId={selectedId ?? ""}
              onSelect={(id) => {
                const p = state.patients.find((x) => x.id === id);
                if (p) select(p);
              }}
              showArchived
              showAdmissionHistory={false}
              showSelectedSummary={false}
              fullWidth={false}
            />
            <Button variant="outline" onClick={reset}><Plus className="h-4 w-4" /> New Patient</Button>
            <Button variant="outline" onClick={handlePrintChart} disabled={!selectedPatient}>
              <Printer className="h-4 w-4" /> Print Chart
            </Button>
          </>
        }
      />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[300px_1fr] lg:grid-cols-[360px_1fr] items-stretch min-h-0 overflow-hidden">
        {/* Registry Left Panel */}
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">Registry</CardTitle>
            <div className="flex flex-wrap gap-2 pt-2">
              <StatChip label="Total" value={total} />
              <StatChip label="Active" value={active} tone="success" />
              <StatChip label="Archived" value={archived} tone="warning" />
            </div>
            <div className="relative pt-2">
              <Search className="absolute left-2 top-4 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, contact, or PhilHealth PIN…" className="pl-8 h-9" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {(["active", "archived", "all"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={statusFilter === f ? "default" : "outline"}
                  className="h-7 text-[10px] px-2 capitalize"
                  onClick={() => setStatusFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 border-t flex flex-col min-h-0">
            <ul className="divide-y flex-1 min-h-0 overflow-y-auto">
              {patientList.pageItems.map((p) => {
                const age = computeAge(p.birthDate);
                const admission = getAdmissionStatusFromMap(admissionStatusMap, p.id);
                return (
                <li key={p.id}>
                  <button
                    onClick={() => select(p)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm hover:bg-muted ${selectedId === p.id ? "bg-muted" : ""}`}
                  >
                    <span className="font-medium">{p.lastName}, {p.firstName} {p.middleName}</span>
                    <span className="text-xs text-muted-foreground">
                      {age !== null ? `${age}y` : "—"} · {p.gender} · {admission} · {p.archived ? "Archived" : "Active"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{p.contactNumber} · Reg. {formatRegisteredDate(p.createdAt)}</span>
                  </button>
                </li>
              );})}
              {filtered.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No records found</li>}
            </ul>
            <ListPagination
              page={patientList.page}
              totalPages={patientList.totalPages}
              totalItems={patientList.totalItems}
              onPageChange={patientList.setPage}
            />
          </CardContent>
        </Card>

        {/* Register/Edit Right Panel */}
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">{selectedId ? "Edit Patient" : "Register Patient"}</CardTitle>
            {selectedPatient && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span>Age: {computeAge(selectedPatient.birthDate) ?? "—"}</span>
                <span>·</span>
                <span>Registered: {formatRegisteredDate(selectedPatient.createdAt)}</span>
                <span>·</span>
                <span>Admission: {getAdmissionStatusFromMap(admissionStatusMap, selectedPatient.id)}</span>
                {selectedPatient.philhealth?.memberNumber && (
                  <>
                    <span>·</span>
                    <span>PhilHealth: {selectedPatient.philhealth.memberNumber}</span>
                  </>
                )}
              </div>
            )}
            {isDuplicate && <p className="text-xs text-destructive">⚠ A patient with this name already exists.</p>}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-6 p-5 border-t flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Personal Information */}
              <Section title="Personal Information" subtitle="Name, birth date & contact details">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <Field label="First Name *">
                    <Input className="h-9" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </Field>
                  <Field label="Middle Name">
                    <Input className="h-9" value={form.middleName || ""} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
                  </Field>
                  <Field label="Last Name *">
                    <Input className="h-9" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </Field>
                  <Field label="Suffix">
                    <Input className="h-9" value={form.suffix || ""} onChange={(e) => setForm({ ...form, suffix: e.target.value })} placeholder="e.g. Jr., III" />
                  </Field>
                  <Field label="Birth Date (YYYY-MM-DD)">
                    <Input className="h-9" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </Field>
                  <Field label="Gender">
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as Patient["gender"] })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Civil Status">
                    <Select value={form.civilStatus} onValueChange={(v) => setForm({ ...form, civilStatus: v as Patient["civilStatus"] })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Single", "Married", "Widowed", "Separated"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Contact Number">
                    <Input className="h-9" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
                  </Field>
                  <Field label="Email Address">
                    <Input className="h-9" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </Field>
                </div>
              </Section>

              {/* Address & Emergency Contact */}
              <Section title="Address & Emergency Contact" subtitle="Home address and emergency information">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <Field label="Street Address">
                    <Input className="h-9" value={form.address.street} onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} />
                  </Field>
                  <Field label="Barangay">
                    <Input className="h-9" value={form.address.barangay} onChange={(e) => setForm({ ...form, address: { ...form.address, barangay: e.target.value } })} />
                  </Field>
                  <Field label="City / Municipality">
                    <Input className="h-9" value={form.address.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} />
                  </Field>
                  <Field label="Province">
                    <Input className="h-9" value={form.address.province} onChange={(e) => setForm({ ...form, address: { ...form.address, province: e.target.value } })} />
                  </Field>
                  <Field label="Emergency Contact Name">
                    <Input className="h-9" value={form.emergencyContact.name} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })} />
                  </Field>
                  <Field label="Relationship">
                    <Input className="h-9" value={form.emergencyContact.relationship || ""} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })} placeholder="e.g. Spouse, Parent, Child" />
                  </Field>
                  <Field label="Emergency Phone">
                    <Input className="h-9" value={form.emergencyContact.phone} onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })} />
                  </Field>
                </div>
              </Section>

              {/* PhilHealth & Classification */}
              <Section title="PhilHealth & Classification" subtitle="Member details and special classifications">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <Field label="PhilHealth Number">
                    <Input className="h-9" value={form.philhealth.memberNumber || ""} onChange={(e) => setForm({ ...form, philhealth: { ...form.philhealth, memberNumber: e.target.value } })} />
                  </Field>
                  <Field label="PhilHealth Category">
                    <Select 
                      value={form.philhealth.category || "Employed"} 
                      onValueChange={(v) => setForm({ ...form, philhealth: { ...form.philhealth, category: v } })}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Employed", "Self-Employed", "Direct Contributor", "Indirect Contributor", "Indigent", "Sponsored", "Lifetime"].map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Member Type">
                    <Select 
                      value={form.philhealth.memberType || "Member"} 
                      onValueChange={(v) => setForm({ ...form, philhealth: { ...form.philhealth, memberType: v } })}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Member", "Dependent"].map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 border-t pt-4">
                  {/* Senior Citizen Checkbox + ID Input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="senior-citizen" 
                        checked={form.seniorCitizen.flag} 
                        onCheckedChange={(c) => setForm({ ...form, seniorCitizen: { ...form.seniorCitizen, flag: Boolean(c) } })} 
                      />
                      <Label htmlFor="senior-citizen" className="text-xs font-semibold cursor-pointer">Senior Citizen</Label>
                    </div>
                    <Field label="Senior ID Number">
                      <Input 
                        className="h-9" 
                        placeholder="Enter Senior ID" 
                        value={form.seniorCitizen.idNumber ?? ""} 
                        onChange={(e) => setForm({ ...form, seniorCitizen: { ...form.seniorCitizen, idNumber: e.target.value } })} 
                        disabled={!form.seniorCitizen.flag}
                      />
                    </Field>
                  </div>

                  {/* PWD Checkbox + ID Input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="pwd" 
                        checked={form.pwd.flag} 
                        onCheckedChange={(c) => setForm({ ...form, pwd: { ...form.pwd, flag: Boolean(c) } })} 
                      />
                      <Label htmlFor="pwd" className="text-xs font-semibold cursor-pointer">PWD</Label>
                    </div>
                    <Field label="PWD ID Number">
                      <Input 
                        className="h-9" 
                        placeholder="Enter PWD ID" 
                        value={form.pwd.idNumber ?? ""} 
                        onChange={(e) => setForm({ ...form, pwd: { ...form.pwd, idNumber: e.target.value } })} 
                        disabled={!form.pwd.flag}
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              {selectedPatient && (
                <PatientSearchWithHistory
                  patients={state.patients}
                  selectedPatientId={selectedPatient.id}
                  onSelect={(id) => {
                    const p = state.patients.find((x) => x.id === id);
                    if (p) select(p);
                  }}
                  hideSearch
                  showArchived
                />
              )}

              {selectedPatient && renderPatientChart(false)}
            </div>

            {/* Form Actions Footer */}
            <div className="flex flex-wrap justify-end gap-2 border-t pt-3 mt-4 shrink-0">
              <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> Clear</Button>
              {selectedId && form.archived && (
                <Button variant="secondary" size="sm" onClick={restore}><Archive className="h-3.5 w-3.5" /> Restore</Button>
              )}
              {selectedId && !form.archived && (
                <Button variant="destructive" size="sm" onClick={archive}><Archive className="h-3.5 w-3.5" /> Archive</Button>
              )}
              {selectedId && (
                <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              )}
              <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5" /> {selectedId ? "Update" : "Register"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {selectedPatient && (
        <div id="print-area-patient-chart" className="hidden">
          {renderPatientChart(true)}
        </div>
      )}
    </div>
    </>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
