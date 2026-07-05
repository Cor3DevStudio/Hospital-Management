import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Save, Trash2, RotateCcw, Bed, Printer } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { buildPatientMap } from "@/lib/stateIndexes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import {
  createERRecord,
  createAdmissionFromER,
  deleteERRecord,
  emptyERRecord,
  updateERRecord,
} from "@/lib/services/erService";
import { getActiveDoctors } from "@/lib/services/userService";
import { ERRecordDocument } from "@/components/clinical/ERRecordDocument";
import { buildPatientChartModel } from "@/components/clinical/buildPatientChartModel";
import { PatientChartDocument } from "@/components/clinical/PatientChartDocument";
import { ClinicalPrintPreviewModal } from "@/components/clinical/ClinicalPrintPreviewModal";
import { getClinicalPrintCss, triggerClinicalPrint } from "@/components/clinical/clinicalPrintStyles";
import {
  getPatientChartPrintCss,
  triggerPatientChartPrint,
  triggerPatientChartSavePdf,
} from "@/components/clinical/patientChartPrintStyles";
import { useStore, type ERRecord } from "@/lib/store";

export const Route = createFileRoute("/er")({
  head: () => ({ meta: [{ title: "Emergency Room — Hospital CMS" }] }),
  component: ERPage,
});

function ERPage() {
  const { state, setState } = useStore();
  const [form, setForm] = useState<ERRecord>(emptyERRecord());
  const [editId, setEditId] = useState<string | null>(null);
  const [admitRoom, setAdmitRoom] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showChartPreview, setShowChartPreview] = useState(false);

  const patients = state.patients.filter((p) => !p.archived);
  const printPatient = useMemo(
    () => state.patients.find((p) => p.id === form.patientId),
    [state.patients, form.patientId]
  );
  const preparedBy =
    state.users.find((u) => u.username === state.authedUser)?.fullName || state.authedUser || undefined;
  const canPrint = Boolean(editId && form.patientId);
  const canPrintChart = Boolean(form.patientId);
  const chartModel = useMemo(
    () => (form.patientId ? buildPatientChartModel(state, form.patientId) : null),
    [state, form.patientId]
  );
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const erList = usePaginatedList(state.erRecords, 50);
  const doctors = getActiveDoctors(state.users);

  const reset = () => {
    setEditId(null);
    setForm(emptyERRecord());
    setAdmitRoom("");
  };

  const save = () => {
    if (!form.patientId || !form.arrivalDate || !form.arrivalTime || !form.attendingDoctor) {
      return toast.error("Patient, arrival details, and doctor are required");
    }
    if (editId) {
      setState((s) => updateERRecord(s, { ...form, id: editId }));
    } else {
      setState((s) => createERRecord(s, form));
    }
    toast.success(editId ? "ER record updated" : "ER record created");
    reset();
  };

  const remove = (id: string) => {
    setState((s) => deleteERRecord(s, id));
    toast.success("ER record deleted");
    if (editId === id) reset();
  };

  const admitFromER = () => {
    if (!editId) return toast.error("Save ER visit first");
    if (!admitRoom.trim()) return toast.error("Room/Ward is required for admission");
    const result = createAdmissionFromER(state, editId, admitRoom.trim());
    if ("error" in result) return toast.error(result.error);
    setState(result.state);
    toast.success("Admission created from ER visit");
  };

  return (
    <>
      <style>{getClinicalPrintCss()}</style>
      <style>{getPatientChartPrintCss()}</style>
      <div className="no-print h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader title="Emergency Room" description="Manage ER triage, arrivals, treatment status, and dispositions." />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">ER Cases</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Patient</TableHead>
                  <TableHead>Triage</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.erRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No records yet</TableCell>
                  </TableRow>
                ) : (
                  erList.pageItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 text-xs">{patientMap.get(item.patientId)?.lastName ?? "—"}</TableCell>
                      <TableCell className="text-xs">{item.triageLevel}</TableCell>
                      <TableCell className="text-xs">{item.arrivalDate} {item.arrivalTime}</TableCell>
                      <TableCell className="text-xs">{item.disposition || item.status}</TableCell>
                      <TableCell className="text-right pr-4">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setEditId(item.id); setForm(item); }}>Edit</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ListPagination page={erList.page} totalPages={erList.totalPages} totalItems={erList.totalItems} onPageChange={erList.setPage} />
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">{editId ? "Edit ER Visit" : "Log ER Visit"}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t">
            <PatientSearchWithHistory
              patients={state.patients}
              selectedPatientId={form.patientId}
              onSelect={(id) => setForm({ ...form, patientId: id })}
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Chief Complaint</Label>
              <Textarea className="min-h-[60px] text-sm" value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Triage Level</Label>
                <Select value={form.triageLevel} onValueChange={(v) => setForm({ ...form, triageLevel: v as ERRecord["triageLevel"] })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Red", "Yellow", "Green", "Black"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Disposition</Label>
                <Select value={form.disposition || ""} onValueChange={(v) => setForm({ ...form, disposition: v as ERRecord["disposition"], status: v === "Admitted" ? "Admitted" : form.status })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Admitted", "Discharged", "Transferred", "Released"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Date In</Label>
                <Input type="date" className="h-9 text-xs" value={form.arrivalDate} onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Time In</Label>
                <Input type="time" className="h-9 text-xs" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Attending Doctor</Label>
              <Select value={form.attendingDoctor} onValueChange={(v) => setForm({ ...form, attendingDoctor: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.fullName}>{d.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Attending Nurse</Label>
              <Input className="h-9 text-sm" value={form.attendingNurse || ""} onChange={(e) => setForm({ ...form, attendingNurse: e.target.value })} />
            </div>
            {form.disposition === "Admitted" && editId && !form.admissionId && (
              <div className="rounded border p-3 space-y-2 bg-muted/30">
                <Label className="text-xs font-medium">Create Admission from ER</Label>
                <Input placeholder="Room / Ward" value={admitRoom} onChange={(e) => setAdmitRoom(e.target.value)} className="h-9 text-sm" />
                <Button size="sm" onClick={admitFromER}><Bed className="h-3.5 w-3.5" /> Admit Patient</Button>
              </div>
            )}
            {form.admissionId && <p className="text-xs text-muted-foreground">Linked admission: {form.admissionId}</p>}
            <div className="flex justify-end gap-2 border-t pt-3">
              {canPrintChart && (
                <Button variant="outline" size="sm" onClick={() => setShowChartPreview(true)}>
                  <Printer className="h-3.5 w-3.5" /> Print Chart
                </Button>
              )}
              {canPrint && (
                <Button variant="outline" size="sm" onClick={() => setShowPrintPreview(true)}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> Clear</Button>
              <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClinicalPrintPreviewModal
        open={showPrintPreview}
        title="ER Record Preview"
        subtitle="Review the layout before sending to the printer."
        onClose={() => setShowPrintPreview(false)}
        onPrint={() => {
          setShowPrintPreview(false);
          triggerClinicalPrint();
        }}
      >
        {editId ? (
          <ERRecordDocument
            hospital={state.hospital}
            record={{ ...form, id: editId }}
            patient={printPatient}
            preparedBy={preparedBy}
          />
        ) : null}
      </ClinicalPrintPreviewModal>

      <ClinicalPrintPreviewModal
        open={showChartPreview}
        title="Patient Chart Preview"
        subtitle="Review the patient's medical chart before printing or saving as PDF."
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

      <div id="clinical-print-area" className="force-light">
        {editId && form.patientId ? (
          <ERRecordDocument
            hospital={state.hospital}
            record={{ ...form, id: editId }}
            patient={printPatient}
            preparedBy={preparedBy}
          />
        ) : null}
      </div>

      <div id="patient-chart-print-area" className="force-light">
        {chartModel ? <PatientChartDocument model={chartModel} /> : null}
      </div>
    </>
  );
}
