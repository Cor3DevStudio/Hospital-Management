import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Save, RotateCcw, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatChip } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import {
  cancelAppointment,
  createAppointment,
  deleteAppointment,
  getAllAppointments,
  getAppointmentsForDate,
  patientName,
  updateAppointment,
} from "@/lib/services/appointmentService";
import { getActiveDoctors } from "@/lib/services/userService";
import { useStore, todayISO, type Appointment } from "@/lib/store";

export const Route = createFileRoute("/appointments")({
  head: () => ({ meta: [{ title: "Appointments — Hospital CMS" }] }),
  component: AppointmentsPage,
});

const statusColors: Record<Appointment["status"], string> = {
  Scheduled: "bg-info/15 text-info border-info/20",
  Confirmed: "bg-success/15 text-success border-success/20",
  Completed: "bg-primary/15 text-primary border-primary/20",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  "No Show": "bg-warning/20 text-warning-foreground border-warning/30",
};

const empty = (): Appointment => ({
  id: "",
  patientId: "",
  doctor: "",
  date: todayISO(),
  time: "09:00",
  reason: "",
  status: "Scheduled",
});

function AppointmentsPage() {
  const { state, setState } = useStore();
  const [date, setDate] = useState(todayISO());
  const [form, setForm] = useState<Appointment>(empty());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"day" | "all">("day");

  const doctors = getActiveDoctors(state.users);
  const activePatients = state.patients.filter((p) => !p.archived);
  const dayAppts = useMemo(
    () => getAppointmentsForDate(state.appointments, date),
    [state.appointments, date]
  );
  const allAppts = useMemo(() => getAllAppointments(state.appointments), [state.appointments]);
  const allApptsList = usePaginatedList(allAppts, 50);

  const stats = {
    total: dayAppts.length,
    scheduled: dayAppts.filter((a) => a.status === "Scheduled").length,
    confirmed: dayAppts.filter((a) => a.status === "Confirmed").length,
  };

  const reset = () => {
    setSelectedId(null);
    setForm({ ...empty(), date });
  };

  const save = () => {
    if (!form.patientId || !form.doctor) return toast.error("Patient and doctor are required");
    if (!activePatients.some((p) => p.id === form.patientId)) {
      return toast.error("Select a valid active patient");
    }

    setState((s) => {
      const exists = s.appointments.find((a) => a.id === form.id);
      return exists ? updateAppointment(s, form) : createAppointment(s, form);
    });
    toast.success(selectedId ? "Appointment updated" : "Appointment created");
    reset();
  };

  const cancel = () => {
    if (!selectedId) return;
    setState((s) => cancelAppointment(s, selectedId));
    toast.success("Appointment cancelled");
    reset();
  };

  const remove = () => {
    if (!selectedId) return;
    if (!confirm("Permanently delete this appointment?")) return;
    setState((s) => deleteAppointment(s, selectedId));
    toast.success("Appointment deleted");
    reset();
  };

  const renderAppointmentRow = (a: Appointment, showDate = false) => (
    <TableRow
      key={a.id}
      className={selectedId === a.id ? "bg-muted" : undefined}
      onClick={() => {
        setSelectedId(a.id);
        setForm({ ...a });
        setDate(a.date);
      }}
    >
      {showDate && <TableCell className="text-xs">{a.date}</TableCell>}
      <TableCell className="font-mono text-xs">{a.time}</TableCell>
      <TableCell className="text-xs">{patientName(state.patients, a.patientId)}</TableCell>
      <TableCell className="text-xs">{a.doctor}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{a.reason || "—"}</TableCell>
      <TableCell>
        <Badge className={`text-[10px] ${statusColors[a.status]}`} variant="outline">{a.status}</Badge>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden bg-background">
      <PageHeader title="Appointments" description="Daily appointment scheduler with full lifecycle management." />
      <div className="flex-1 grid gap-4 p-4 md:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.4fr_1fr] items-stretch min-h-0 overflow-hidden">
        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-3 pt-4 px-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "day" | "all")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList className="h-8">
                  <TabsTrigger value="day" className="text-xs px-3">By Date</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs px-3">All Appointments</TabsTrigger>
                </TabsList>
                {tab === "day" && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDate(todayISO())}>
                      Today
                    </Button>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto h-8 text-xs py-1" />
                  </div>
                )}
              </div>

              <TabsContent value="day" className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <StatChip label="Total" value={stats.total} />
                  <StatChip label="Scheduled" value={stats.scheduled} tone="info" />
                  <StatChip label="Confirmed" value={stats.confirmed} tone="success" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["Scheduled", "Confirmed", "Completed", "Cancelled", "No Show"] as const).map((s) => (
                    <Badge key={s} className={`text-[10px] px-1.5 py-0.5 font-normal ${statusColors[s]}`} variant="outline">{s}</Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 border-t min-h-0">
            {tab === "day" ? (
              <ul className="divide-y">
                {dayAppts.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => {
                        setSelectedId(a.id);
                        setForm({ ...a });
                      }}
                      className={`grid w-full grid-cols-[60px_1fr_auto] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted ${selectedId === a.id ? "bg-muted" : ""}`}
                    >
                      <span className="font-mono text-xs font-semibold">{a.time}</span>
                      <div>
                        <p className="font-medium">{patientName(state.patients, a.patientId)}</p>
                        <p className="text-xs text-muted-foreground">{a.doctor} · {a.reason}</p>
                      </div>
                      <Badge className={`text-xs ${statusColors[a.status]}`} variant="outline">{a.status}</Badge>
                    </button>
                  </li>
                ))}
                {dayAppts.length === 0 && (
                  <li className="p-6 text-center text-sm text-muted-foreground">No appointments for this date</li>
                )}
              </ul>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allAppts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allApptsList.pageItems.map((a) => renderAppointmentRow(a, true))
                    )}
                  </TableBody>
                </Table>
                <ListPagination page={allApptsList.page} totalPages={allApptsList.totalPages} totalItems={allApptsList.totalItems} onPageChange={allApptsList.setPage} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full min-h-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">{selectedId ? "Edit Appointment" : "New Appointment"}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 pt-2 border-t flex flex-col justify-between">
            <div className="space-y-4">
              <PatientSearchWithHistory
                patients={state.patients}
                selectedPatientId={form.patientId}
                onSelect={(id) => setForm({ ...form, patientId: id })}
              />

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Attending doctor</Label>
                <Select value={form.doctor} onValueChange={(v) => setForm({ ...form, doctor: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.length === 0 ? (
                      <SelectItem value="__none" disabled>No doctors in system — log in after DB seed</SelectItem>
                    ) : (
                      doctors.map((d) => <SelectItem key={d.id} value={d.fullName}>{d.fullName}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input className="h-9 text-xs" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input className="h-9 text-xs" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <Input className="h-9 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Appointment["status"] })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Scheduled", "Confirmed", "Completed", "Cancelled", "No Show"] as const).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-3 mt-4 shrink-0">
              <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /> Clear</Button>
              {selectedId && (
                <>
                  <Button variant="destructive" size="sm" onClick={cancel}><Ban className="h-3.5 w-3.5" /> Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                </>
              )}
              <Button size="sm" onClick={save}><Save className="h-3.5 w-3.5" /> Save</Button>
              {!selectedId && <Button variant="secondary" size="sm" onClick={() => setForm(empty())}><Plus className="h-3.5 w-3.5" /> New</Button>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
