import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Archive, Save, RotateCcw, Printer, Trash2 } from "lucide-react";
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
import { buildPatientChartModel } from "@/components/clinical/buildPatientChartModel";
import { PatientChartDocument } from "@/components/clinical/PatientChartDocument";
import { PatientChartViewer } from "@/components/clinical/PatientChartViewer";
import { ClinicalPrintPreviewModal } from "@/components/clinical/ClinicalPrintPreviewModal";
import {
  getPatientChartPrintCss,
  triggerPatientChartPrint,
  triggerPatientChartSavePdf,
} from "@/components/clinical/patientChartPrintStyles";
import {
  archivePatient,
  computeAge,
  createPatient,
  deletePatient,
  emptyPatient,
  filterPatients,
  formatRegisteredDate,
  getAdmissionStatus,
  isDuplicatePatient,
  restorePatient,
  updatePatient,
  type PatientFilter,
} from "@/lib/services/patientService";
import { useStore, type Patient } from "@/lib/store";

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Patients — Hospital CMS" }] }),
  component: PatientsPage,
});

const emptyPatientForm = emptyPatient;

function PatientsPage() {
  const { state, setState, addAttachment, deleteAttachment, getAttachmentBlob } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientFilter>("active");
  const [form, setForm] = useState<Patient>(emptyPatientForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showChartPreview, setShowChartPreview] = useState(false);

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
  const chartModel = useMemo(
    () => (selectedPatient ? buildPatientChartModel(state, selectedPatient.id) : null),
    [state, selectedPatient]
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
    setForm(emptyPatientForm());
  };

  const save = () => {
    if (!form.firstName || !form.lastName) return toast.error("First name and Last name are required");
    if (isDuplicate) return toast.error("A patient with this name already exists");
    setState((s) => {
      const exists = s.patients.find((p) => p.id === form.id);
      return exists ? updatePatient(s, form) : createPatient(s, form).state;
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
    if (!chartModel) return toast.error("Select a patient to print the chart");
    setShowChartPreview(true);
  };

  return (
    <>
      <style>{getPatientChartPrintCss()}</style>
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
              allowCreate={false}
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

              {selectedPatient && chartModel && (
                <PatientChartViewer
                  model={chartModel}
                  onUploadAttachment={async (file) => {
                    await addAttachment("patient", selectedPatient.id, file);
                  }}
                  onDeleteAttachment={async (id) => {
                    await deleteAttachment(id);
                  }}
                  onOpenAttachment={async (attachment) => {
                    const blob = await getAttachmentBlob(attachment.key);
                    if (!blob) {
                      toast.error("File not found");
                      return;
                    }
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                    setTimeout(() => URL.revokeObjectURL(url), 30_000);
                  }}
                  onDownloadAttachment={async (attachment) => {
                    const blob = await getAttachmentBlob(attachment.key);
                    if (!blob) {
                      toast.error("File not found");
                      return;
                    }
                    const url = URL.createObjectURL(blob);
                    const el = document.createElement("a");
                    el.href = url;
                    el.download = attachment.filename || "document.pdf";
                    document.body.appendChild(el);
                    el.click();
                    el.remove();
                    URL.revokeObjectURL(url);
                  }}
                />
              )}
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

      <ClinicalPrintPreviewModal
        open={showChartPreview}
        title="Patient Chart Preview"
        subtitle="Review the medical chart before printing or saving as PDF."
        onClose={() => setShowChartPreview(false)}
        onPrint={() => {
          setShowChartPreview(false);
          triggerPatientChartPrint();
        }}
        onSavePdf={() => {
          setShowChartPreview(false);
          triggerPatientChartSavePdf();
        }}
      >
        {chartModel ? <PatientChartDocument model={chartModel} /> : null}
      </ClinicalPrintPreviewModal>
    </div>

      <div id="patient-chart-print-area" className="force-light">
        {chartModel ? <PatientChartDocument model={chartModel} /> : null}
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
