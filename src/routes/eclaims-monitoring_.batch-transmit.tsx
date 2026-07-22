import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Printer, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatChip } from "@/components/PageHeader";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList, useResetPageOnChange } from "@/lib/hooks/usePaginatedList";
import { buildBillMap, buildPatientMap } from "@/lib/stateIndexes";
import { EClaimsBatchTransmittalReceipt } from "@/components/eclaims/EClaimsBatchTransmittalReceipt";
import { getEclaimsPrintCss } from "@/components/eclaims/eclaimsPrintStyles";
import {
  buildBatchTransmittalMeta,
  filterEClaims,
  getClaimDeadlineFromDates,
  resolveClaimDates,
  transmitEClaimsBatch,
  type BatchTransmittalMeta,
} from "@/lib/services/eclaimService";
import { useStore, type EClaim } from "@/lib/store";

export const Route = createFileRoute("/eclaims-monitoring_/batch-transmit")({
  head: () => ({ meta: [{ title: "Transmit by Batch — eClaims — Hospital CMS" }] }),
  component: EClaimsBatchTransmitPage,
});

function EClaimsBatchTransmitPage() {
  const { state, setState } = useStore();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptMeta, setReceiptMeta] = useState<BatchTransmittalMeta | null>(null);
  const [receiptClaims, setReceiptClaims] = useState<EClaim[]>([]);
  const [showHeader, setShowHeader] = useState(true);

  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const billMap = useMemo(() => buildBillMap(state.bills), [state.bills]);

  const pendingClaims = useMemo(
    () =>
      filterEClaims(state, {
        claimStatus: "Pending",
        query: query || undefined,
      }),
    [state, query],
  );

  const claimList = usePaginatedList(pendingClaims, 50);
  useResetPageOnChange(claimList.resetPage, [query]);

  const preparedBy =
    state.users.find((u) => u.username === state.authedUser)?.fullName ||
    state.authedUser ||
    undefined;

  const allVisibleSelected =
    claimList.pageItems.length > 0 &&
    claimList.pageItems.every((c) => selectedIds.has(c.id));

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const c of claimList.pageItems) {
        if (checked) next.add(c.id);
        else next.delete(c.id);
      }
      return next;
    });
  };

  const selectAllPending = () => {
    setSelectedIds(new Set(pendingClaims.map((c) => c.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleTransmitBatch = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      toast.error("Select at least one pending claim");
      return;
    }

    const toTransmit = (state.eClaims ?? []).filter(
      (c) => ids.includes(c.id) && c.claimStatus === "Pending",
    );
    if (toTransmit.length === 0) {
      toast.error("No pending claims in the current selection");
      return;
    }

    const meta = buildBatchTransmittalMeta(state.hospital, toTransmit.length);
    setState((s) => transmitEClaimsBatch(s, toTransmit.map((c) => c.id)));
    setSelectedIds(new Set());
    setReceiptClaims(toTransmit);
    setReceiptMeta(meta);
    setReceiptOpen(true);
    toast.success(`${toTransmit.length} eClaim(s) transmitted as a batch`);
  };

  const runPrint = () => {
    setTimeout(() => window.print(), 150);
  };

  return (
    <>
      <style>{getEclaimsPrintCss()}</style>
      <div className="no-print">
        <PageHeader
          title="Transmit by Batch"
          description="Select pending eClaims and submit them together. Monitoring stays available for tracking and single-claim submit."
        />
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/eclaims-monitoring">
                <ArrowLeft className="h-4 w-4" /> Back to Monitoring
              </Link>
            </Button>
            <StatChip label="Pending" value={pendingClaims.length} tone="warning" />
            <StatChip label="Selected" value={selectedIds.size} tone="info" />
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={selectAllPending}>
                Select all pending
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection} disabled={selectedIds.size === 0}>
                Clear
              </Button>
              <Button size="sm" onClick={handleTransmitBatch} disabled={selectedIds.size === 0}>
                <Send className="h-4 w-4" /> Transmit selected ({selectedIds.size})
              </Button>
            </div>
          </div>

          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border">
              <CardTitle className="text-sm font-semibold text-card-foreground">
                Pending claims for batch
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <div className="space-y-1.5 max-w-sm">
                <Label className="text-xs font-semibold text-muted-foreground">Search</Label>
                <Input
                  placeholder="Patient, claim ID, case rate…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Batch selection</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {pendingClaims.length} pending
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(v) => togglePage(v === true)}
                        aria-label="Select page"
                      />
                    </TableHead>
                    <TableHead>Claim</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Admission</TableHead>
                    <TableHead>Discharge</TableHead>
                    <TableHead>Case Rate</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingClaims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        No pending eClaims to transmit.
                      </TableCell>
                    </TableRow>
                  ) : (
                    claimList.pageItems.map((claim) => {
                      const p = patientMap.get(claim.patientId);
                      const bill = claim.billId ? billMap.get(claim.billId) : undefined;
                      const dates = resolveClaimDates(state, claim, bill);
                      const deadline = getClaimDeadlineFromDates(dates);
                      return (
                        <TableRow key={claim.id}>
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={selectedIds.has(claim.id)}
                              onCheckedChange={(v) => toggleOne(claim.id, v === true)}
                              aria-label={`Select ${claim.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{claim.id}</TableCell>
                          <TableCell className="font-medium">
                            {p
                              ? `${p.lastName}, ${p.firstName}`.toUpperCase()
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {dates.admissionDate || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {dates.dischargeDate || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {claim.caseRateCode || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {deadline ? (
                              <span>
                                {deadline.deadlineDate}
                                {deadline.isOverdue
                                  ? ` · ${Math.abs(deadline.daysRemaining)}d overdue`
                                  : ` · ${deadline.daysRemaining}d left`}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{claim.claimStatus}</Badge>
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
        </div>
      </div>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="no-print flex h-[90vh] w-full max-w-[920px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[920px]">
          <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 pr-12 text-left">
            <DialogTitle className="text-sm font-semibold">
              Batch Transmittal Receipt — PDF Preview
            </DialogTitle>
            <p className="text-[11px] font-normal text-muted-foreground">
              {receiptMeta
                ? `${receiptMeta.totalClaims} claim(s) · TCN ${receiptMeta.transmissionControlNumber}`
                : "Receipt ready after transmit"}
            </p>
          </DialogHeader>

          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-muted/30 px-4 py-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => setShowHeader(e.target.checked)}
                className="rounded border-border"
              />
              Show facility header
            </label>
            <span className="text-[11px] text-muted-foreground">
              Custom CMS receipt template (facility · ticket · TCN · claim list)
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-200/80 p-4 sm:p-6">
            <div className="mx-auto max-w-[210mm] rounded-sm bg-white shadow-lg">
              {receiptMeta && receiptClaims.length > 0 ? (
                <EClaimsBatchTransmittalReceipt
                  hospital={state.hospital}
                  meta={receiptMeta}
                  claims={receiptClaims}
                  patientMap={patientMap}
                  billMap={billMap}
                  admissions={state.admissions ?? []}
                  preparedBy={preparedBy}
                  showHeader={showHeader}
                />
              ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-4 py-3 sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setReceiptOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={runPrint}>
              <Printer className="mr-1 h-4 w-4" /> Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div id="eclaims-print-area" className="force-light" aria-hidden={!receiptOpen}>
        {receiptMeta && receiptClaims.length > 0 ? (
          <EClaimsBatchTransmittalReceipt
            hospital={state.hospital}
            meta={receiptMeta}
            claims={receiptClaims}
            patientMap={patientMap}
            billMap={billMap}
            admissions={state.admissions ?? []}
            preparedBy={preparedBy}
            showHeader={showHeader}
          />
        ) : null}
      </div>
    </>
  );
}
