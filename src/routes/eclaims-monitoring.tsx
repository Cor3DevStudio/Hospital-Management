import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Send, FilterX, Printer, Plus, Save, Trash2, Paperclip, FileDown, FileCode } from "lucide-react";
import { toast } from "sonner";
import { MAX_ATTACHMENT_SIZE_LABEL, validateAttachmentFile } from "@/lib/attachmentValidation";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList, useResetPageOnChange } from "@/lib/hooks/usePaginatedList";
import { buildBillMap, buildPatientMap } from "@/lib/stateIndexes";
import { EClaimSlipDocument } from "@/components/eclaims/EClaimSlipDocument";
import { EClaimsRegistryDocument } from "@/components/eclaims/EClaimsRegistryDocument";
import { getEclaimsPrintCss } from "@/components/eclaims/eclaimsPrintStyles";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatChip } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import {
  createEClaim,
  deleteEClaim,
  filterEClaims,
  getClaimAttachments,
  getEClaimStats,
  getPatientPhilhealthStatus,
  resolveClaimAdmission,
  resolveClaimDates,
  syncEClaimFromBill,
  updateEClaim,
  updateEClaimStatus,
} from "@/lib/services/eclaimService";
import type { Cf4FormData } from "@/components/philhealth/buildCf4Values";
import {
  buildPhilHealthXmlFile,
  findPhilHealthXmlAttachments,
  validatePhilHealthXml,
  type PhilHealthXmlForm,
} from "@/lib/services/philhealthXmlService";
import {
  buildEclaimMergedPdfPackage,
  downloadBlob,
  getMergeableAttachments,
} from "@/lib/services/eclaimDocumentService";
import { useStore, todayISO, type EClaim, type EClaimStatus } from "@/lib/store";

type PrintMode = "registry" | "slip";

export const Route = createFileRoute("/eclaims-monitoring")({
  head: () => ({ meta: [{ title: "eClaims Monitoring — Hospital CMS" }] }),
  component: EClaimsPage,
});

const emptyClaim = (): Omit<EClaim, "id" | "createdAt" | "updatedAt"> => ({
  patientId: "",
  billId: undefined,
  admissionDate: todayISO(),
  roomWard: "",
  philhealthStatus: "Not a Member",
  caseRateCode: "",
  claimStatus: "Pending",
  notes: "",
});

function EClaimsPage() {
  const { state, setState, addAttachment, deleteAttachment, getAttachmentBlob } = useStore();
  const [typeFilter, setTypeFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("Not Transmitted");
  const [caseRateFilter, setCaseRateFilter] = useState("All");
  const [query, setQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyClaim());
  const [attachClaimId, setAttachClaimId] = useState<string | null>(null);

  const [printOpen, setPrintOpen] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>("registry");
  const [printPages, setPrintPages] = useState<EClaim[][]>([]);
  const [slipClaim, setSlipClaim] = useState<EClaim | null>(null);
  const [showHeader, setShowHeader] = useState(true);

  const filteredClaims = useMemo(
    () =>
      filterEClaims(state, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        patientType: typeFilter,
        caseRateFilter,
        claimStatus: statusFilter,
        query,
      }),
    [state, startDate, endDate, typeFilter, caseRateFilter, statusFilter, query]
  );

  const claimList = usePaginatedList(filteredClaims, 50);
  useResetPageOnChange(claimList.resetPage, [startDate, endDate, typeFilter, caseRateFilter, statusFilter, query]);

  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const billMap = useMemo(() => buildBillMap(state.bills), [state.bills]);

  const stats = useMemo(() => getEClaimStats(filteredClaims), [filteredClaims]);

  const ageDays = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  const latestAdmissionForPatient = (patientId: string) =>
    state.admissions
      .filter((a) => a.patientId === patientId)
      .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))[0];

  const openCreate = () => {
    setEditId(null);
    setForm(emptyClaim());
    setFormOpen(true);
  };

  const openEdit = (claim: EClaim) => {
    const bill = claim.billId ? billMap.get(claim.billId) : undefined;
    const dates = resolveClaimDates(state, claim, bill);
    setEditId(claim.id);
    setForm({
      patientId: claim.patientId,
      billId: claim.billId,
      admissionDate: dates.admissionDate || claim.admissionDate,
      roomWard: dates.roomWard ?? claim.roomWard ?? "",
      philhealthStatus: claim.philhealthStatus,
      caseRateCode: claim.caseRateCode ?? "",
      claimStatus: claim.claimStatus,
      notes: claim.notes ?? "",
    });
    setFormOpen(true);
  };

  const saveClaim = () => {
    if (!form.patientId) return toast.error("Patient is required");
    if (editId) {
      const existing = (state.eClaims ?? []).find((c) => c.id === editId);
      if (!existing) return;
      setState((s) => updateEClaim(s, { ...existing, ...form }));
      toast.success("eClaim updated");
    } else {
      setState((s) => createEClaim(s, form));
      toast.success("eClaim created");
    }
    setFormOpen(false);
  };

  const transmit = (claimId: string) => {
    setState((s) => {
      let next = updateEClaimStatus(s, claimId, "Submitted");
      const claim = (next.eClaims ?? []).find((c) => c.id === claimId);
      if (claim?.billId) {
        next = {
          ...next,
          bills: next.bills.map((b) =>
            b.id === claim.billId ? { ...b, eclaimStatus: "Transmitted" as const } : b
          ),
        };
      }
      return next;
    });
    toast.success("eClaim marked as submitted");
  };

  const importFromBills = () => {
    const discharged = state.bills.filter((b) => b.dischargeDate);
    if (discharged.length === 0) return toast.info("No discharged bills to import");
    setState((s) => {
      let next = s;
      for (const bill of discharged) {
        if ((next.eClaims ?? []).some((c) => c.billId === bill.id)) continue;
        next = syncEClaimFromBill(next, bill);
      }
      return next;
    });
    toast.success("Imported eClaims from discharged bills");
  };

  const chunk = <T,>(arr: T[], size: number) => {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
  };

  const preparedBy =
    state.users.find((u) => u.username === state.authedUser)?.fullName || state.authedUser || undefined;

  const openRegistryPreview = () => {
    if (filteredClaims.length === 0) {
      toast.message("No claims to print for the current filters.");
      return;
    }
    setPrintMode("registry");
    setSlipClaim(null);
    setPrintPages(chunk(filteredClaims, 25));
    setPrintOpen(true);
  };

  const openSlipPreview = (claim: EClaim) => {
    setPrintMode("slip");
    setSlipClaim(claim);
    setPrintPages([]);
    setPrintOpen(true);
  };

  const runPrint = () => {
    setTimeout(() => window.print(), 150);
  };

  const runSavePdf = () => {
    toast.info('Use your browser’s print dialog and choose “Save as PDF”.');
    runPrint();
  };

  const registryFilters = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      patientType: typeFilter,
      caseRateFilter,
      claimStatus: statusFilter,
      query: query || undefined,
    }),
    [startDate, endDate, typeFilter, caseRateFilter, statusFilter, query]
  );

  const slipPatient = slipClaim ? patientMap.get(slipClaim.patientId) : undefined;
  const slipBill = slipClaim?.billId ? billMap.get(slipClaim.billId) : undefined;

  const handleAttachFiles = async (claimId: string, files: File[]) => {
    if (files.length === 0) return;
    let attached = 0;
    for (const file of files) {
      const validation = validateAttachmentFile(file);
      if (!validation.valid) {
        toast.error(validation.message);
        continue;
      }
      try {
        await addAttachment("eclaim", claimId, file);
        attached += 1;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to attach ${file.name}`);
      }
    }
    if (attached > 0) {
      toast.success(attached === 1 ? "Document attached" : `${attached} documents attached`);
    }
  };

  const handleAttachGeneratedXml = async (claimId: string, form: PhilHealthXmlForm) => {
    const claim = (state.eClaims ?? []).find((c) => c.id === claimId);
    if (!claim?.billId) return toast.error("Link a bill to this eClaim before generating XML");
    const bill = billMap.get(claim.billId);
    const patient = patientMap.get(claim.patientId);
    const admission = resolveClaimAdmission(state, claim, bill);
    const xmlValidation = validatePhilHealthXml({
      form,
      bill,
      patient,
      claim,
      hospital: state.hospital,
      attach: true,
    });
    if (!xmlValidation.valid) return toast.error(xmlValidation.errors[0] ?? "Cannot generate XML");
    const file = buildPhilHealthXmlFile({
      form,
      bill: bill!,
      patient,
      hospital: state.hospital,
      admission,
      claimId: claim.id,
      cf4Overrides: claim.cf4Overrides as Partial<Cf4FormData> | undefined,
    });
    try {
      const existing = findPhilHealthXmlAttachments(state, claimId, form);
      for (const attachment of existing) {
        await deleteAttachment(attachment.id);
      }
      await addAttachment("eclaim", claimId, file);
      toast.success(`${form}.xml attached`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to attach XML");
    }
  };

  const handleDownloadAttachment = async (attachmentId: string) => {
    const attachment = (state.attachments ?? []).find((a) => a.id === attachmentId);
    if (!attachment) return toast.error("Attachment not found");
    try {
      const blob = await getAttachmentBlob(attachment.key);
      if (!blob) {
        return toast.error("File data is missing — please re-upload this document.");
      }
      downloadBlob(blob, attachment.filename);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download file");
    }
  };

  const handleMergeAttachments = async (claimId: string) => {
    const claim = (state.eClaims ?? []).find((c) => c.id === claimId);
    const attachments = getClaimAttachments(state, claimId);
    const mergeable = getMergeableAttachments(attachments);
    if (mergeable.length === 0) {
      return toast.error("Upload at least one PDF or image to merge into a package.");
    }

    try {
      const result = await buildEclaimMergedPdfPackage(attachments, getAttachmentBlob);
      const filename = `${claim?.id ?? claimId}-documents.pdf`;
      downloadBlob(result.blob, filename);
      if (result.skipped.length > 0) {
        toast.message(
          `Merged ${result.mergedCount} file(s). Skipped: ${result.skipped.map((s) => s.filename).join(", ")}`
        );
      } else {
        toast.success(`Merged ${result.mergedCount} document(s) into one PDF`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to merge documents");
    }
  };

  const statusBadgeClass = (status: EClaimStatus) => {
    if (status === "Submitted" || status === "Approved") return "bg-success/15 text-success border-success/20";
    if (status === "Denied") return "bg-destructive/15 text-destructive border-destructive/20";
    return "bg-warning/20 text-warning-foreground border-warning/30";
  };

  return (
    <>
      <style>{getEclaimsPrintCss()}</style>
      <div className="no-print">
      <PageHeader
        title="eClaims Monitoring"
        description="Track PhilHealth eClaims submissions per patient with documents and status workflow."
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatChip label="Total Claims" value={stats.total} />
          <StatChip label="Pending" value={stats.pendingCount} tone="warning" />
          <StatChip label="Submitted+" value={stats.submittedCount} tone="success" />
          <Button size="sm" variant="outline" onClick={openCreate}><Plus className="h-4 w-4" /> New eClaim</Button>
          <Button size="sm" variant="outline" onClick={importFromBills}>Import from Bills</Button>
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 border-b border-border">
            <CardTitle className="text-sm font-semibold text-card-foreground">Monitoring & Filter Settings</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Discharge From</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">To</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Patient Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["All", "In-Patient", "Out-Patient", "ER", "OPD", "Dialysis"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Case Rate Code</Label>
                <Select value={caseRateFilter} onValueChange={setCaseRateFilter}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All case rates</SelectItem>
                    <SelectItem value="90935">Dialysis — 90935</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Claim Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Not Transmitted">Pending only</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={() => { setStartDate(""); setEndDate(""); setTypeFilter("All"); setStatusFilter("All"); setCaseRateFilter("All"); setQuery(""); }} className="h-9 text-xs">
                <FilterX className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
            <div className="mt-3">
              <Input placeholder="Search patient or claim ID…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 text-xs max-w-sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>eClaims Registry</span>
              <span className="text-xs text-muted-foreground font-normal">{filteredClaims.length} record(s)</span>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openRegistryPreview}>
              <Printer className="h-4 w-4" /> PDF Preview
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Admission Date</TableHead>
                  <TableHead>Discharged Date</TableHead>
                  <TableHead>Room/Ward</TableHead>
                  <TableHead>PhilHealth</TableHead>
                  <TableHead>Case Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">No records yet</TableCell>
                  </TableRow>
                ) : (
                  claimList.pageItems.map((claim) => {
                    const p = patientMap.get(claim.patientId);
                    const bill = claim.billId ? billMap.get(claim.billId) : undefined;
                    const dates = resolveClaimDates(state, claim, bill);
                    const age = dates.dischargeDate ? ageDays(dates.dischargeDate) : ageDays(dates.admissionDate);
                    const attachments = getClaimAttachments(state, claim.id);
                    return (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{p ? `${p.lastName}, ${p.firstName}` : "—"}</TableCell>
                        <TableCell><Badge variant="outline">{bill?.patientType ?? "—"}</Badge></TableCell>
                        <TableCell>{dates.admissionDate || "—"}</TableCell>
                        <TableCell>{dates.dischargeDate || "—"}</TableCell>
                        <TableCell>{dates.roomWard || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{claim.philhealthStatus}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{claim.caseRateCode || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(claim.claimStatus)}>{claim.claimStatus}</Badge>
                          {claim.claimStatus === "Pending" && age > 50 && (
                            <span className="ml-1 text-[10px] text-amber-600">{60 - age}d left</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAttachClaimId(claim.id)}>
                            <Paperclip className="h-3 w-3" /> {attachments.length}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {claim.claimStatus === "Pending" && (
                              <Button size="sm" className="h-7 text-xs" onClick={() => transmit(claim.id)}><Send className="h-3 w-3" /> Submit</Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(claim)}>Edit</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" title="Claim slip PDF" onClick={() => openSlipPreview(claim)}><Printer className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7" onClick={() => setState((s) => deleteEClaim(s, claim.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <ListPagination
              page={claimList.page}
              totalPages={claimList.totalPages}
              totalItems={claimList.totalItems}
              onPageChange={claimList.setPage}
            />
          </CardContent>
        </Card>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit eClaim" : "New eClaim"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Patient</Label>
                <PatientSearchWithHistory
                  patients={state.patients}
                  selectedPatientId={form.patientId}
                  onSelect={(id) => {
                    const patient = state.patients.find((p) => p.id === id);
                    const admission = latestAdmissionForPatient(id);
                    setForm((f) => ({
                      ...f,
                      patientId: id,
                      philhealthStatus: getPatientPhilhealthStatus(patient),
                      admissionDate: admission?.admissionDate ?? f.admissionDate,
                      roomWard: admission?.roomWard ?? f.roomWard,
                    }));
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Linked Bill (optional)</Label>
                <Select value={form.billId ?? "none"} onValueChange={(v) => {
                  const billId = v === "none" ? undefined : v;
                  const bill = billId ? state.bills.find((b) => b.id === billId) : undefined;
                  const admission = bill
                    ? resolveClaimAdmission(state, { patientId: form.patientId, admissionDate: form.admissionDate }, bill)
                    : latestAdmissionForPatient(form.patientId);
                  setForm((f) => ({
                    ...f,
                    billId,
                    admissionDate: admission?.admissionDate ?? f.admissionDate,
                    roomWard: admission?.roomWard ?? f.roomWard,
                    caseRateCode: bill?.caseRateCode ?? f.caseRateCode,
                  }));
                }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {state.bills.filter((b) => b.patientId === form.patientId || !form.patientId).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Admission Date</Label>
                  <Input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Room / Ward</Label>
                  <Input value={form.roomWard} onChange={(e) => setForm({ ...form, roomWard: e.target.value })} className="h-9 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">PhilHealth Status</Label>
                  <Select value={form.philhealthStatus} onValueChange={(v) => setForm({ ...form, philhealthStatus: v as EClaim["philhealthStatus"] })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Dependent">Dependent</SelectItem>
                      <SelectItem value="Not a Member">Not a Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Case Rate Code</Label>
                  <Input value={form.caseRateCode} onChange={(e) => setForm({ ...form, caseRateCode: e.target.value })} className="h-9 text-xs" placeholder="e.g. 90935" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Claim Status</Label>
                <Select value={form.claimStatus} onValueChange={(v) => setForm({ ...form, claimStatus: v as EClaimStatus })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Pending", "Submitted", "Approved", "Denied"] as EClaimStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={saveClaim}><Save className="h-4 w-4" /> Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!attachClaimId} onOpenChange={(o) => !o && setAttachClaimId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Attached Documents</DialogTitle></DialogHeader>
            {attachClaimId && (
              <div className="space-y-3">
                <Input
                  type="file"
                  multiple
                  accept="application/pdf,application/xml,text/xml,image/jpeg,image/png,image/gif,image/webp,.pdf,.xml,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0 && attachClaimId) void handleAttachFiles(attachClaimId, files);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Max {MAX_ATTACHMENT_SIZE_LABEL} per file. Select one or more PDF, XML, or image files —
                  they can be merged into one package for submission.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => attachClaimId && void handleMergeAttachments(attachClaimId)}
                    disabled={getMergeableAttachments(getClaimAttachments(state, attachClaimId)).length < 1}
                  >
                    <FileDown className="mr-1 h-3 w-3" /> Merge PDF Package
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["ESOA", "CF4", "CF5"] as PhilHealthXmlForm[]).map((form) => (
                    <Button
                      key={form}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => attachClaimId && void handleAttachGeneratedXml(attachClaimId, form)}
                    >
                      <FileCode className="mr-1 h-3 w-3" /> Attach {form}.xml
                    </Button>
                  ))}
                </div>
                <ul className="text-sm space-y-2">
                  {getClaimAttachments(state, attachClaimId).map((a) => (
                    <li key={a.id} className="flex justify-between items-center gap-2 border rounded p-2">
                      <span className="truncate text-sm">{a.filename}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void handleDownloadAttachment(a.id)}>
                          <FileDown className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void deleteAttachment(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </li>
                  ))}
                  {getClaimAttachments(state, attachClaimId).length === 0 && (
                    <li className="text-muted-foreground text-center py-4">No documents attached</li>
                  )}
                </ul>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={printOpen} onOpenChange={setPrintOpen}>
          <DialogContent className="no-print flex h-[90vh] w-full max-w-[920px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[920px]">
            <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 pr-12 text-left">
              <DialogTitle className="text-sm font-semibold">
                {printMode === "slip" ? "Claim Slip — PDF Preview" : "eClaims Registry — PDF Preview"}
              </DialogTitle>
              <p className="text-[11px] font-normal text-muted-foreground">
                {printMode === "slip"
                  ? "Official claim summary slip for the selected eClaim."
                  : `${filteredClaims.length} claim(s) · ${printPages.length} page(s) · A4 portrait`}
              </p>
            </DialogHeader>

            {printMode === "registry" && (
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-muted/30 px-4 py-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showHeader}
                    onChange={(e) => setShowHeader(e.target.checked)}
                    className="rounded border-border"
                  />
                  Show hospital header
                </label>
                <span className="text-[11px] text-muted-foreground">
                  25 claims per page · includes filters, status summary, and signature block
                </span>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-200/80 p-4 sm:p-6">
              <div className="mx-auto max-w-[210mm] rounded-sm bg-white shadow-lg">
                {printMode === "slip" && slipClaim ? (
                  <EClaimSlipDocument
                    hospital={state.hospital}
                    claim={slipClaim}
                    patient={slipPatient}
                    bill={slipBill}
                    admissions={state.admissions}
                    preparedBy={preparedBy}
                  />
                ) : (
                  <EClaimsRegistryDocument
                    hospital={state.hospital}
                    pages={printPages}
                    patientMap={patientMap}
                    billMap={billMap}
                    admissions={state.admissions}
                    filters={registryFilters}
                    stats={stats}
                    preparedBy={preparedBy}
                    showHeader={showHeader}
                  />
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-4 py-3 sm:justify-end">
              <Button variant="ghost" size="sm" onClick={() => setPrintOpen(false)}>
                Close
              </Button>
              <Button variant="outline" size="sm" onClick={runSavePdf}>
                <FileDown className="mr-1 h-4 w-4" /> Save as PDF
              </Button>
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={runPrint}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Print-only document — isolated from app chrome */}
      <div id="eclaims-print-area" className="force-light">
        {printMode === "slip" && slipClaim ? (
          <EClaimSlipDocument
            hospital={state.hospital}
            claim={slipClaim}
            patient={slipPatient}
            bill={slipBill}
            admissions={state.admissions}
            preparedBy={preparedBy}
          />
        ) : printOpen || printPages.length > 0 ? (
          <EClaimsRegistryDocument
            hospital={state.hospital}
            pages={printPages}
            patientMap={patientMap}
            billMap={billMap}
            admissions={state.admissions}
            filters={registryFilters}
            stats={stats}
            preparedBy={preparedBy}
            showHeader={showHeader}
          />
        ) : null}
      </div>
    </>
  );
}
