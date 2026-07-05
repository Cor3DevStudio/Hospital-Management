import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calculator, FileStack, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { CaseRatePicker } from "@/components/CaseRatePicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClaimFormSuiteModal,
  type ClaimFormId,
  type SuiteClaimMeta,
} from "@/components/philhealth/ClaimFormSuiteModal";
import { OfficialCF1Sheet } from "@/components/philhealth/OfficialCF1Sheet";
import { OfficialCSFSheet } from "@/components/philhealth/OfficialCSFSheet";
import { OfficialCF2Sheet } from "@/components/philhealth/OfficialCF2Sheet";
import { OfficialCF3Sheet } from "@/components/philhealth/OfficialCF3Sheet";
import { OfficialCF4Sheet } from "@/components/philhealth/OfficialCF4Sheet";
import { OfficialCF5Sheet } from "@/components/philhealth/OfficialCF5Sheet";
import { OfficialESOASheet } from "@/components/philhealth/OfficialESOASheet";
import type { Cf2FormData } from "@/components/philhealth/buildCf2Values";
import type { Cf4FormData } from "@/components/philhealth/buildCf4Values";
import { getCf1PrintCss } from "@/components/billing/billingPrintStyles";
import { buildPatientMap } from "@/lib/stateIndexes";
import { formatPatientName } from "@/lib/services/patientHistoryService";
import {
  patchCf2Override,
  patchCf4Override,
} from "@/lib/services/claimFormService";
import { syncEClaimFromBill, updateEClaim } from "@/lib/services/eclaimService";
import {
  buildPhilHealthXmlFile,
  downloadPhilHealthXmlFile,
  findPhilHealthXmlAttachments,
  validatePhilHealthXml,
  type PhilHealthXmlForm,
} from "@/lib/services/philhealthXmlService";
import { useStore, type Bill, type EClaimStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/philhealth")({
  head: () => ({ meta: [{ title: "PhilHealth eClaims — Hospital CMS" }] }),
  component: PhilHealthPage,
});

type DisplayStatus = {
  label: string;
  tone: SuiteClaimMeta["statusTone"];
  badgeClass: string;
};

function getDisplayStatus(bill: Bill, claimStatus?: EClaimStatus): DisplayStatus {
  const raw = bill.eclaimStatus;
  if (raw === "Transmitted" || claimStatus === "Submitted") {
    return {
      label: "TRANSMITTED",
      tone: "transmitted",
      badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    };
  }
  if (raw === "Approved" || claimStatus === "Approved") {
    return {
      label: "APPROVED",
      tone: "approved",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
  }
  if (raw === "Rejected" || claimStatus === "Denied") {
    return {
      label: "REJECTED",
      tone: "rejected",
      badgeClass: "bg-red-100 text-red-800 border-red-200",
    };
  }
  return {
    label: "DRAFT",
    tone: "draft",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  };
}

function PhilHealthPage() {
  const { state, setState, addAttachment, deleteAttachment } = useStore();
  const [calcCaseCode, setCalcCaseCode] = useState("");
  const [calcCaseAmount, setCalcCaseAmount] = useState(0);
  const [hospitalCharges, setHospitalCharges] = useState(20000);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [suiteOpen, setSuiteOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<ClaimFormId>("CF1");
  const [suiteBillId, setSuiteBillId] = useState<string | null>(null);
  const [cf2Overrides, setCf2Overrides] = useState<Partial<Cf2FormData>>({});
  const [cf4Overrides, setCf4Overrides] = useState<Partial<Cf4FormData>>({});

  const benefit = Math.min(calcCaseAmount, hospitalCharges);
  const patientShare = Math.max(0, hospitalCharges - benefit);

  const patientMap = useMemo(() => buildPatientMap(state.patients), [state.patients]);
  const claimByBillId = useMemo(() => {
    const map = new Map<string, (typeof state.eClaims)[number]>();
    for (const claim of state.eClaims ?? []) {
      if (claim.billId) map.set(claim.billId, claim);
    }
    return map;
  }, [state.eClaims]);

  const claimsDirectory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.bills]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .filter((bill) => {
        const claim = claimByBillId.get(bill.id);
        const status = getDisplayStatus(bill, claim?.claimStatus);
        if (statusFilter !== "All" && status.label !== statusFilter) return false;
        if (!q) return true;
        const patient = patientMap.get(bill.patientId);
        const name = formatPatientName(patient).toLowerCase();
        return (
          bill.id.toLowerCase().includes(q) ||
          name.includes(q) ||
          (bill.caseRateCode ?? "").toLowerCase().includes(q)
        );
      });
  }, [state.bills, claimByBillId, patientMap, query, statusFilter]);

  const stats = useMemo(() => {
    let draft = 0;
    let transmitted = 0;
    let approved = 0;
    let rejected = 0;
    for (const bill of state.bills) {
      const claim = claimByBillId.get(bill.id);
      const status = getDisplayStatus(bill, claim?.claimStatus);
      if (status.tone === "draft") draft += 1;
      else if (status.tone === "transmitted") transmitted += 1;
      else if (status.tone === "approved") approved += 1;
      else rejected += 1;
    }
    return {
      total: state.bills.length,
      draft,
      transmitted,
      approved,
      rejected,
    };
  }, [state.bills, claimByBillId]);

  const suiteBill = useMemo(
    () => state.bills.find((b) => b.id === suiteBillId),
    [state.bills, suiteBillId]
  );

  const suiteClaim = useMemo(() => {
    if (!suiteBillId) return undefined;
    return claimByBillId.get(suiteBillId);
  }, [claimByBillId, suiteBillId]);

  const suiteMeta = useMemo<SuiteClaimMeta | null>(() => {
    if (!suiteBill) return null;
    const patient = patientMap.get(suiteBill.patientId);
    const status = getDisplayStatus(suiteBill, suiteClaim?.claimStatus);
    return {
      claimId: suiteClaim?.id ?? suiteBill.id,
      billId: suiteBill.id,
      patientName: formatPatientName(patient),
      confinementDate: suiteClaim?.admissionDate ?? suiteBill.date,
      statusLabel: status.label,
      statusTone: status.tone,
    };
  }, [suiteBill, suiteClaim, patientMap]);

  const openSuite = (bill: Bill) => {
    setState((s) => syncEClaimFromBill(s, bill));
    setSuiteBillId(bill.id);
    setActiveForm("CF1");
    setSuiteOpen(true);
  };

  useEffect(() => {
    if (!suiteOpen || !suiteBillId) return;
    const claim = (state.eClaims ?? []).find((c) => c.billId === suiteBillId);
    setCf2Overrides((claim?.cf2Overrides as Partial<Cf2FormData> | undefined) ?? {});
    setCf4Overrides((claim?.cf4Overrides as Partial<Cf4FormData> | undefined) ?? {});
  }, [suiteOpen, suiteBillId, state.eClaims]);

  const handleValidate = () => {
    if (!suiteBill) return toast.error("No claim selected");
    toast.success("Claim forms validated (placeholder — official rules coming soon)");
  };

  const handleSave = () => {
    if (!suiteBill) return toast.error("No claim selected");
    setState((s) => {
      let next = syncEClaimFromBill(s, suiteBill);
      const claim = (next.eClaims ?? []).find((c) => c.billId === suiteBill.id);
      if (claim) {
        next = updateEClaim(next, {
          ...claim,
          cf2Overrides,
          cf4Overrides,
        });
      }
      return next;
    });
    toast.success("Claim suite changes saved");
  };

  const handleExportXml = async (form: PhilHealthXmlForm, attach: boolean) => {
    if (!suiteBill) return toast.error("No claim selected");
    const patient = patientMap.get(suiteBill.patientId);
    let claim = suiteClaim;
    if (!claim) {
      const synced = syncEClaimFromBill(state, suiteBill);
      claim = (synced.eClaims ?? []).find((c) => c.billId === suiteBill.id);
      setState(synced);
    }
    const validation = validatePhilHealthXml({
      form,
      bill: suiteBill,
      patient,
      claim,
      hospital: state.hospital,
      attach,
    });
    if (!validation.valid) {
      toast.error(validation.errors[0] ?? "Cannot generate XML");
      return;
    }
    const file = buildPhilHealthXmlFile({
      form,
      bill: suiteBill,
      patient,
      hospital: state.hospital,
      admission: suiteAdmission,
      claimId: claim?.id,
      cf4Overrides,
    });
    if (attach) {
      if (!claim) return toast.error("No eClaim found to attach XML");
      try {
        const existing = findPhilHealthXmlAttachments(state, claim.id, form);
        for (const attachment of existing) {
          await deleteAttachment(attachment.id);
        }
        await addAttachment("eclaim", claim.id, file);
        toast.success(`${form}.xml attached to eClaim`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to attach XML");
      }
      return;
    }
    downloadPhilHealthXmlFile(file);
    toast.success(`${form}.xml downloaded`);
  };

  const handleTransmit = () => {
    if (!suiteBill) return toast.error("No claim selected");
    setState((s) => {
      let next = syncEClaimFromBill(s, suiteBill);
      const claim = (next.eClaims ?? []).find((c) => c.billId === suiteBill.id);
      if (claim) {
        next = updateEClaim(next, {
          ...claim,
          cf2Overrides,
          cf4Overrides,
          claimStatus: "Submitted",
        });
      }
      return {
        ...next,
        bills: next.bills.map((b) =>
          b.id === suiteBill.id ? { ...b, eclaimStatus: "Transmitted" as const } : b
        ),
      };
    });
    toast.success("Claim transmitted");
  };

  const handlePrint = () => {
    if (!suiteBill) return toast.error("No claim selected");
    setTimeout(() => window.print(), 100);
  };

  const suitePatient = suiteBill ? patientMap.get(suiteBill.patientId) : undefined;
  const suiteAdmission = useMemo(() => {
    if (!suiteBill) return undefined;
    return state.admissions
      .filter((a) => a.patientId === suiteBill.patientId)
      .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))[0];
  }, [state.admissions, suiteBill]);

  return (
    <>
      <style>{getCf1PrintCss()}</style>
      <div className="no-print flex h-[calc(100vh-3rem)] flex-col overflow-hidden bg-background">
      <PageHeader
        title="PhilHealth eClaims"
        description="Manage Claims Form Suite (CF1 to CF5, ESOA), validate clinical records, and transmit electronic claims."
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status summary */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Claims" value={stats.total} tone="default" />
          <StatCard label="Draft / Pending" value={stats.draft} tone="warning" />
          <StatCard label="Transmitted" value={stats.transmitted} tone="info" />
          <StatCard label="Approved" value={stats.approved} tone="success" />
          <StatCard label="Rejected" value={stats.rejected} tone="destructive" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          {/* Claims Directory */}
          <Card className="min-w-0">
            <CardHeader className="flex flex-col gap-3 space-y-0 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm font-semibold">Claims Directory</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-8 w-[200px] pl-8 text-xs"
                    placeholder="Search patient or Bill ID..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="TRANSMITTED">Transmitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Claim / Bill ID</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Case Rate</TableHead>
                      <TableHead>Deduction (PHP)</TableHead>
                      <TableHead>eClaim Status</TableHead>
                      <TableHead className="pr-4 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimsDirectory.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          No claims found
                        </TableCell>
                      </TableRow>
                    ) : (
                      claimsDirectory.map((bill) => {
                        const patient = patientMap.get(bill.patientId);
                        const claim = claimByBillId.get(bill.id);
                        const status = getDisplayStatus(bill, claim?.claimStatus);
                        return (
                          <TableRow key={bill.id}>
                            <TableCell className="pl-4 text-sm font-medium text-blue-600">
                              {bill.id}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatPatientName(patient)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {bill.caseRateCode || "None"}
                            </TableCell>
                            <TableCell className="text-sm">
                              ₱{(bill.philhealthDeduction ?? 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                  status.badgeClass
                                )}
                              >
                                {status.label}
                              </span>
                            </TableCell>
                            <TableCell className="pr-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-sky-200 bg-sky-50 text-xs text-sky-700 hover:bg-sky-100 hover:text-sky-800"
                                onClick={() => openSuite(bill)}
                              >
                                <FileStack className="mr-1.5 h-3.5 w-3.5" />
                                Suite
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Benefit Calculator */}
          <Card>
            <CardHeader className="border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calculator className="h-4 w-4 text-blue-600" /> Benefit Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select Case Rate Type</Label>
                <CaseRatePicker
                  value={calcCaseCode}
                  amount={calcCaseAmount}
                  onSelect={(code, amount) => {
                    setCalcCaseCode(code === "none" ? "" : code);
                    setCalcCaseAmount(amount);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Total Hospital Charges (₱)</Label>
                <Input
                  type="number"
                  className="h-9"
                  value={hospitalCharges}
                  onChange={(e) => setHospitalCharges(+e.target.value)}
                />
              </div>
              <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Hospital Fee</span>
                  <span>
                    ₱{hospitalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>PhilHealth Case Coverage</span>
                  <span>
                    ₱{calcCaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-bold text-emerald-600">
                  <span>PhilHealth Benefit (Deduction)</span>
                  <span>
                    − ₱{benefit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-1 flex justify-between rounded border-t border-border bg-muted/50 px-1 pt-2 text-sm font-extrabold">
                  <span>Patient Net Co-Pay</span>
                  <span className="text-primary">
                    ₱{patientShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="rounded-sm border border-border bg-muted p-3 text-[10px] italic leading-relaxed text-muted-foreground">
                Note: In case rate systems, the PhilHealth deduction covers both facility fees
                (70%) and professional fees (30%).
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ClaimFormSuiteModal
        open={suiteOpen}
        onOpenChange={setSuiteOpen}
        activeForm={activeForm}
        onActiveFormChange={setActiveForm}
        meta={suiteMeta}
        bill={suiteBill}
        patient={suitePatient}
        hospital={state.hospital}
        admission={suiteAdmission}
        cf2Overrides={cf2Overrides}
        cf4Overrides={cf4Overrides}
        onCf2FieldChange={(field, value) =>
          setCf2Overrides((current) => patchCf2Override(current, field, value))
        }
        onCf4FieldChange={(field, value) =>
          setCf4Overrides((current) => patchCf4Override(current, field, value))
        }
        onValidate={handleValidate}
        onSave={handleSave}
        onTransmit={handleTransmit}
        onPrint={handlePrint}
        onExportXml={(form, attach) => void handleExportXml(form, attach)}
      />
      </div>

      {/* Print-only CF sheet — sibling of UI so PDF excludes chrome/tabs/sidebar */}
      {suiteBill && (
        <div id="cf-print-area" className="force-light">
          {activeForm === "ESOA" ? (
            <OfficialESOASheet
              bill={suiteBill}
              patient={suitePatient}
              hospital={state.hospital}
            />
          ) : activeForm === "CSF" ? (
            <OfficialCSFSheet
              bill={suiteBill}
              patient={suitePatient}
              admission={suiteAdmission}
            />
          ) : activeForm === "CF5" ? (
            <OfficialCF5Sheet
              bill={suiteBill}
              patient={suitePatient}
              hospital={state.hospital}
              admission={suiteAdmission}
            />
          ) : activeForm === "CF4" ? (
            <OfficialCF4Sheet
              bill={suiteBill}
              patient={suitePatient}
              hospital={state.hospital}
              admission={suiteAdmission}
              overrides={cf4Overrides}
            />
          ) : activeForm === "CF3" ? (
            <OfficialCF3Sheet
              bill={suiteBill}
              patient={suitePatient}
              hospital={state.hospital}
              admission={suiteAdmission}
            />
          ) : activeForm === "CF2" ? (
            <OfficialCF2Sheet
              bill={suiteBill}
              patient={suitePatient}
              hospital={state.hospital}
              admission={suiteAdmission}
              overrides={cf2Overrides}
            />
          ) : (
            <OfficialCF1Sheet bill={suiteBill} patient={suitePatient} />
          )}
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "warning" | "info" | "success" | "destructive";
}) {
  const toneClass = {
    default: "bg-muted/80 border-border text-foreground",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-sky-50 border-sky-200 text-sky-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    destructive: "bg-red-50 border-red-200 text-red-900",
  }[tone];

  return (
    <div className={cn("rounded-lg border px-3 py-2.5", toneClass)}>
      <p className="text-[11px] font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
