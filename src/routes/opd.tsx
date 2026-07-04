import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Save, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { ListPagination } from "@/components/ListPagination";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { getUpcomingForPatient, patientName } from "@/lib/services/appointmentService";
import {
  createConsultation,
  deleteConsultation,
  emptyConsultation,
  getAllConsultations,
  getConsultationsForPatient,
  markConsultationSeen,
  updateConsultation,
} from "@/lib/services/consultationService";
import { getActiveDoctors } from "@/lib/services/userService";
import { useStore, type Consultation } from "@/lib/store";

export const Route = createFileRoute("/opd")({
  head: () => ({ meta: [{ title: "OPD — Hospital CMS" }] }),
  component: OPDPage,
});

function OPDPage() {
  const { state, setState } = useStore();
  const activePatients = state.patients.filter((p) => !p.archived);
  const [patientId, setPatientId] = useState<string>(activePatients[0]?.id ?? "");
  const [form, setForm] = useState<Consultation>(emptyConsultation(patientId));
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab] = useState<"patient" | "all">("patient");

  const doctors = getActiveDoctors(state.users);
  const patientVisits = useMemo(
    () => getConsultationsForPatient(state.consultations, patientId),
    [state.consultations, patientId]
  );
  const allVisits = useMemo(() => getAllConsultations(state.consultations), [state.consultations]);
  const allVisitsList = usePaginatedList(allVisits, 50);
  const linkedAppointments = useMemo(
    () => getUpcomingForPatient(state.appointments, patientId),
    [state.appointments, patientId]
  );

  const addRx = () =>
    setForm({ ...form, prescriptions: [...form.prescriptions, { medicine: "", dosage: "", instructions: "" }] });
  const updateRx = (i: number, key: "medicine" | "dosage" | "instructions", v: string) => {
    const next = [...form.prescriptions];
    next[i] = { ...next[i], [key]: v };
    setForm({ ...form, prescriptions: next });
  };
  const removeRx = (i: number) =>
    setForm({ ...form, prescriptions: form.prescriptions.filter((_, idx) => idx !== i) });

  const resetForm = (pid = patientId) => {
    setEditId(null);
    setForm(emptyConsultation(pid));
  };

  const save = () => {
    if (!form.patientId) return toast.error("Select a patient");
    if (!form.chiefComplaint) return toast.error("Chief complaint required");

    setState((s) => {
      const exists = s.consultations.find((c) => c.id === form.id);
      return exists ? updateConsultation(s, form) : createConsultation(s, form);
    });
    toast.success(editId ? "OPD visit updated" : "OPD visit saved");
    resetForm();
  };

  const remove = () => {
    if (!editId) return;
    if (!confirm("Delete this OPD visit record?")) return;
    setState((s) => deleteConsultation(s, editId));
    toast.success("OPD visit deleted");
    resetForm();
  };

  const discharge = (c: Consultation) => {
    setState((s) => markConsultationSeen(s, c));
    toast.success("OPD visit marked as seen. eClaims now eligible.");
    if (editId === c.id) {
      setForm((f) => ({ ...f, status: "Seen", discharged: true }));
    }
  };

  const selectVisit = (c: Consultation) => {
    setEditId(c.id);
    setForm({ ...c });
    setPatientId(c.patientId);
    setTab("patient");
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader title="OPD" description="Document outpatient visits, prescriptions, and discharge status." />
      <div className="flex-1 grid gap-4 p-4 grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-stretch min-h-0 overflow-hidden">
        <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 space-y-0 pb-3 pt-4 px-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "patient" | "all")}>
              <TabsList className="h-8 w-full">
                <TabsTrigger value="patient" className="text-xs flex-1">By Patient</TabsTrigger>
                <TabsTrigger value="all" className="text-xs flex-1">All Records</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden border-t p-0">
            {tab === "patient" ? (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <PatientSearchWithHistory
                  patients={state.patients}
                  selectedPatientId={patientId}
                  onSelect={(id) => {
                    setPatientId(id);
                    resetForm(id);
                  }}
                />

                <div className="min-w-0">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    OPD Visit History
                  </p>
                  <ul className="space-y-2">
                    {patientVisits.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => selectVisit(c)}
                          className={`w-full rounded-md border p-3 text-left text-xs hover:bg-muted ${editId === c.id ? "bg-muted border-primary/40" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold whitespace-nowrap">{c.date}</span>
                            <Badge
                              className={`shrink-0 text-[10px] px-1.5 py-0 ${c.status === "Seen" ? "bg-success/15 text-success border-success/20" : "bg-warning/20 text-warning-foreground border-warning/30"}`}
                              variant="outline"
                            >
                              {c.status}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 break-words text-muted-foreground leading-relaxed">
                            {c.diagnosis || c.chiefComplaint}
                          </p>
                        </button>
                      </li>
                    ))}
                    {patientVisits.length === 0 && (
                      <li className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                        No OPD visits for this patient yet.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <ul className="space-y-2">
                    {allVisits.length === 0 ? (
                      <li className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
                        No records found
                      </li>
                    ) : (
                      allVisitsList.pageItems.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => selectVisit(c)}
                            className={`w-full rounded-md border p-3 text-left text-xs hover:bg-muted ${editId === c.id ? "bg-muted border-primary/40" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold break-words">
                                  {patientName(state.patients, c.patientId)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {c.date}
                                  {c.doctor ? ` · ${c.doctor}` : ""}
                                </p>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                                {c.status}
                              </Badge>
                            </div>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <ListPagination
                  page={allVisitsList.page}
                  totalPages={allVisitsList.totalPages}
                  totalItems={allVisitsList.totalItems}
                  onPageChange={allVisitsList.setPage}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-2 pt-4 px-4">
            <CardTitle className="text-base">{editId ? "Edit OPD Visit" : "New OPD Visit"}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col justify-between space-y-4 overflow-y-auto border-t p-4 pt-3">
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input className="h-9 text-xs" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        status: v as Consultation["status"],
                        discharged: v === "Seen",
                      })
                    }
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Seen">Seen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Attending doctor</Label>
                  <Select value={form.doctor} onValueChange={(v) => setForm({ ...form, doctor: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Doctor" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map((u) => (
                        <SelectItem key={u.id} value={u.fullName}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {linkedAppointments.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Linked appointment (optional)</Label>
                  <Select
                    value={form.appointmentId ?? "__none"}
                    onValueChange={(v) => setForm({ ...form, appointmentId: v === "__none" ? undefined : v })}
                  >
                    <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {linkedAppointments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.date} {a.time} — {a.reason || "Appointment"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Chief complaint</Label>
                <Input className="h-9 text-sm" value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                <Input className="h-9 text-sm" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Clinical notes</Label>
                <Textarea className="text-sm min-h-[80px] resize-none" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prescriptions</Label>
                  <Button size="sm" variant="outline" className="h-7 shrink-0 px-2.5 text-xs" onClick={addRx}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.prescriptions.map((rx, i) => (
                    <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
                      <Input className="h-9 text-xs" placeholder="Medicine" value={rx.medicine} onChange={(e) => updateRx(i, "medicine", e.target.value)} />
                      <Input className="h-9 text-xs" placeholder="Dosage" value={rx.dosage} onChange={(e) => updateRx(i, "dosage", e.target.value)} />
                      <Input className="h-9 text-xs" placeholder="Instructions" value={rx.instructions} onChange={(e) => updateRx(i, "instructions", e.target.value)} />
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeRx(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {form.prescriptions.length === 0 && <p className="text-xs text-muted-foreground">No prescriptions added.</p>}
                </div>
              </div>
            </div>

            <div className="mt-4 flex shrink-0 flex-wrap justify-end gap-2 border-t pt-3">
              {editId && form.status !== "Seen" && (
                <Button variant="secondary" size="sm" onClick={() => discharge(form)}>
                  <LogOut className="h-3.5 w-3.5" /> Mark Seen
                </Button>
              )}
              {editId && (
                <Button variant="destructive" size="sm" onClick={remove}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
              <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5" /> Save OPD Visit</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
