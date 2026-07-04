import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, RotateCcw, Download, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { buildPatientMap } from "@/lib/stateIndexes";
import { validateAttachmentFile } from "@/lib/attachmentValidation";

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
  cancelDischarge,
  createAdmission,
  deleteAdmission,
  dischargePatient,
  emptyAdmission,
  transferRoom,
  updateAdmission,
} from "@/lib/services/admissionService";
import {
  billableDays,
  ensureDefaultRoomRates,
  getRoomRateItems,
  roomTypeLabel,
} from "@/lib/services/roomBoardService";
import { getPriceAsOf } from "@/lib/priceService";
import { getActiveDoctors } from "@/lib/services/userService";
import { useStore, todayISO, type Admission } from "@/lib/store";

export const Route = createFileRoute("/admission")({
  head: () => ({ meta: [{ title: "Admission — Hospital CMS" }] }),
  component: AdmissionPage,
});

const emptyAdmissionForm = emptyAdmission;

function AdmissionPage() {
  const { state, setState, addAttachment, deleteAttachment, getAttachmentBlob } = useStore();
  const [form, setForm] = useState<Admission>(emptyAdmissionForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [transferTypeId, setTransferTypeId] = useState("");
  const [transferWard, setTransferWard] = useState("");
  const [transferDate, setTransferDate] = useState(todayISO());

  useEffect(() => {
    setState((s) => ensureDefaultRoomRates(s));
  }, [setState]);

  const patients = state.patients.filter((p) => !p.archived);
  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const admList = usePaginatedList(state.admissions, 50);
  const doctors = getActiveDoctors(state.users);
  const roomRates = useMemo(() => getRoomRateItems(state), [state.prices, state.priceHistories]);

  const reset = () => {
    setEditId(null);
    setForm(emptyAdmissionForm());
    setTransferTypeId("");
    setTransferWard("");
    setTransferDate(todayISO());
  };

  const selectRoomType = (roomTypeId: string) => {
    const label = roomTypeLabel(state, roomTypeId);
    setForm((f) => ({
      ...f,
      roomTypeId,
      roomWard: f.roomWard && f.roomTypeId === roomTypeId ? f.roomWard : label,
    }));
  };

  const save = () => {
    if (!form.patientId || !form.roomTypeId || !form.admissionDate || !form.attendingDoctor) {
      return toast.error("Patient, room type, date, and doctor are required");
    }
    const payload = {
      ...form,
      roomWard: form.roomWard || roomTypeLabel(state, form.roomTypeId),
    };
    if (editId) {
      setState((s) => updateAdmission(s, { ...payload, id: editId }));
    } else {
      setState((s) => createAdmission(s, payload));
    }
    toast.success(editId ? "Admission record updated" : "Admission record created");
    reset();
  };

  const remove = (id: string) => {
    setState((s) => deleteAdmission(s, id));
    toast.success("Admission record deleted");
    if (editId === id) reset();
  };

  const handleDischarge = () => {
    if (!editId) return toast.error("Save admission first");
    const dischargeDate = form.dischargeDate || todayISO();
    setState((s) => dischargePatient(s, editId, dischargeDate));
    setForm((f) => ({ ...f, status: "Discharged", dischargeDate }));
    toast.success("Patient discharged — Room & Board auto-charged to billing");
  };

  const handleCancelDischarge = () => {
    if (!editId) return;
    setState((s) => cancelDischarge(s, editId));
    setForm((f) => ({ ...f, status: "Admitted", dischargeDate: undefined }));
    toast.success("Discharge cancelled — Room & Board charge removed");
  };

  const handleTransfer = () => {
    if (!editId) return toast.error("Save admission first");
    if (!transferTypeId) return toast.error("Select a room type to transfer to");
    let updated: Admission | undefined;
    setState((s) => {
      const next = transferRoom(s, editId, {
        roomTypeId: transferTypeId,
        roomWard: transferWard || roomTypeLabel(s, transferTypeId),
        transferDate: transferDate || todayISO(),
      });
      updated = next.admissions.find((a) => a.id === editId);
      return next;
    });
    if (updated) setForm(updated);
    setTransferTypeId("");
    setTransferWard("");
    toast.success("Patient transferred to new room type");
  };

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader title="Admissions" description="Track inpatient admissions, room assignments, and discharge status." />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch min-h-0 overflow-hidden">
        {/* Left: patient search + admission form (stacked, scrollable — no overlap) */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          <PatientSearchWithHistory
            patients={state.patients}
            selectedPatientId={form.patientId}
            onSelect={(patientId) => setForm({ ...form, patientId })}
            onViewAdmission={(admissionId) => {
              const admission = state.admissions.find((item) => item.id === admissionId);
              if (admission) {
                setEditId(admission.id);
                setForm(admission);
              }
            }}
          />

          <Card className="flex flex-col shrink-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">{editId ? "Edit Admission" : "New Admission"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-2 border-t flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Patient</Label>
                <Select value={form.patientId} onValueChange={(value) => setForm({ ...form, patientId: value })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.lastName}, {patient.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Room Type</Label>
                  <Select value={form.roomTypeId || ""} onValueChange={selectRoomType}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select room type" /></SelectTrigger>
                    <SelectContent>
                      {roomRates.length === 0 ? (
                        <SelectItem value="__none" disabled>Configure rates in Settings</SelectItem>
                      ) : (
                        roomRates.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.description} — ₱{(getPriceAsOf(state, "priceItem", r.id, form.admissionDate) ?? r.caseRate).toLocaleString()}/day
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Room / Bed Label</Label>
                  <Input className="h-9 text-sm" value={form.roomWard} onChange={(e) => setForm({ ...form, roomWard: e.target.value })} placeholder="e.g. Ward 3-A" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Admission Date</Label>
                  <Input className="h-9 text-xs" type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Discharge Date</Label>
                  <Input className="h-9 text-xs" type="date" value={form.dischargeDate ?? ""} onChange={(e) => setForm({ ...form, dischargeDate: e.target.value || undefined })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Admission Type</Label>
                  <Select value={form.admissionType} onValueChange={(value) => setForm({ ...form, admissionType: value as Admission["admissionType"] })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Elective">Elective</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as Admission["status"] })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Admitted">Admitted</SelectItem>
                      <SelectItem value="Discharged">Discharged</SelectItem>
                      <SelectItem value="Transferred">Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Attending Doctor</Label>
                <Select value={form.attendingDoctor} onValueChange={(value) => setForm({ ...form, attendingDoctor: value })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <SelectItem value="__none" disabled>No doctors in system</SelectItem>
                    ) : (
                      doctors.map((d) => (
                        <SelectItem key={d.id} value={d.fullName}>{d.fullName}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {editId && form.status === "Admitted" && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Room Transfer
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">New Room Type</Label>
                      <Select value={transferTypeId} onValueChange={(v) => {
                        setTransferTypeId(v);
                        setTransferWard(roomTypeLabel(state, v));
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Room type" /></SelectTrigger>
                        <SelectContent>
                          {roomRates.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.description}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Transfer Date</Label>
                      <Input className="h-8 text-xs" type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px] text-muted-foreground">New Room / Bed Label</Label>
                      <Input className="h-8 text-xs" value={transferWard} onChange={(e) => setTransferWard(e.target.value)} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleTransfer}>
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Room
                  </Button>
                </div>
              )}

              {(form.roomStays?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Room Stay History</Label>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px]">Type</TableHead>
                          <TableHead className="text-[10px]">From</TableHead>
                          <TableHead className="text-[10px]">To</TableHead>
                          <TableHead className="text-[10px] text-right">Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(form.roomStays ?? []).map((stay) => {
                          const end = stay.endDate || form.dischargeDate;
                          const days = end ? billableDays(stay.startDate, end) : "—";
                          return (
                            <TableRow key={stay.id}>
                              <TableCell className="text-xs">{roomTypeLabel(state, stay.roomTypeId) || stay.roomWard}</TableCell>
                              <TableCell className="text-xs">{stay.startDate}</TableCell>
                              <TableCell className="text-xs">{end || "Current"}</TableCell>
                              <TableCell className="text-xs text-right">{days}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Room & Board is auto-posted on discharge (days × rate as of each stay start date).
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea className="min-h-[90px] text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Attachments</Label>
                <div className="space-y-2">
                  <Input type="file" accept="application/pdf,application/xml,text/xml" onChange={async (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (!f) return;
                    const validation = validateAttachmentFile(f);
                    if (!validation.valid) {
                      return toast.error(validation.message);
                    }
                    if (!form.id) return toast.error("Please save the admission record first to attach files.");
                    try {
                      await addAttachment("admission", form.id, f);
                      toast.success("Attachment uploaded");
                    } catch (err) {
                      console.error(err);
                      toast.error(err instanceof Error ? err.message : "Failed to upload attachment");
                    }
                    (e.target as HTMLInputElement).value = "";
                  }} />

                  <div className="space-y-2">
                    {((state.attachments || []) as any).filter((a: any) => a.refType === "admission" && a.refId === form.id).length === 0 && (
                      <p className="text-sm text-muted-foreground">No documents attached to this admission.</p>
                    )}
                    {((state.attachments || []) as any).filter((a: any) => a.refType === "admission" && a.refId === form.id).map((a: any) => (
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
            <div className="flex flex-wrap justify-end gap-2 border-t pt-3 mt-4 shrink-0">
              {editId && form.status === "Admitted" && (
                <Button variant="outline" size="sm" onClick={handleDischarge}>Discharge</Button>
              )}
              {editId && form.status === "Discharged" && (
                <Button variant="outline" size="sm" onClick={handleCancelDischarge}>Cancel Discharge</Button>
              )}
              <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> Clear</Button>
              <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Right: admission records */}
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base">Admission Records</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Patient</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.admissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No records found</TableCell>
                  </TableRow>
                ) : admList.pageItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4 text-xs sm:text-sm">{patientMap.get(item.patientId)?.lastName ?? "Unknown"}</TableCell>
                    <TableCell className="text-xs">{item.roomWard}</TableCell>
                    <TableCell className="text-xs">{item.admissionDate}</TableCell>
                    <TableCell className="text-xs">{item.status}</TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setEditId(item.id); setForm(item); }}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ListPagination page={admList.page} totalPages={admList.totalPages} totalItems={admList.totalItems} onPageChange={admList.setPage} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
