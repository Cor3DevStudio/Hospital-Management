import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  FileText,
  User,
  CreditCard,
  ClipboardList,
  Printer,
  Calendar,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/ListPagination";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import {
  OptionSection,
  RadioRow,
  ReportPrintOptionsModal,
} from "@/components/reports/ReportPrintOptionsModal";
import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import { getReportPrintCss } from "@/components/reports/reportPrintStyles";
import {
  DEFAULT_DOSSIER_OPTIONS,
  DEFAULT_ROSTER_OPTIONS,
  defaultClinicalOptions,
  defaultIncomeOptions,
  defaultRevenueOptions,
  type ClinicalReportOptions,
  type DossierReportOptions,
  type IncomeReportOptions,
  type ReportKind,
  type ReportPrintStatus,
  type ReportViewMode,
  type RevenueReportOptions,
  type RosterReportOptions,
} from "@/components/reports/reportPrintOptions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { PatientSearchWithHistory } from "@/components/PatientSearchWithHistory";
import { useStore, todayISO, type Bill, type Consultation, type Patient } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Hospital CMS" }] }),
  component: ReportsPage,
});

type IncomeRow = {
  label: string;
  gross: number;
  deduction: number;
  net: number;
  paid: number;
  count: number;
};

type ActiveReport = {
  kind: ReportKind;
  title: string;
  subtitle: string;
  body: ReactNode;
};

function money(n: number) {
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={headers.length}
              className="border border-slate-300 px-2 py-6 text-center text-slate-500"
            >
              No records for the selected options.
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-slate-300 px-2 py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function ReportDocument({
  hospitalName,
  hospitalAddress,
  title,
  status,
  generatedAt,
  children,
}: {
  hospitalName: string;
  hospitalAddress: string;
  title: string;
  status: ReportPrintStatus;
  generatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 text-slate-900">
      <div className="border-b border-slate-300 pb-3 text-center">
        <h1 className="text-base font-bold uppercase tracking-wide">
          {hospitalName || "Hospital"}
        </h1>
        {hospitalAddress ? <p className="text-[11px] text-slate-600">{hospitalAddress}</p> : null}
        <h2 className="mt-2 text-sm font-semibold">{title}</h2>
        <p className="text-[11px] text-slate-600">
          Status: {status}
          {status === "Tentative" ? " (Draft)" : ""} · Generated: {generatedAt}
        </p>
      </div>
      {status === "Tentative" ? (
        <p className="text-center text-xs font-bold uppercase tracking-widest text-amber-700">
          Tentative — For Review Only
        </p>
      ) : null}
      {children}
      <p className="pt-4 text-center text-[10px] text-slate-500">Printed: {generatedAt}</p>
    </div>
  );
}

function ReportsPage() {
  const { state } = useStore();
  const today = todayISO();
  const [tab, setTab] = useState("dossier");
  const [selectedPatientId, setSelectedPatientId] = useState<string>(state.patients[0]?.id ?? "");

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<ReportKind | null>(null);
  const [activeReport, setActiveReport] = useState<ActiveReport | null>(null);

  const [dossierOptions, setDossierOptions] =
    useState<DossierReportOptions>(DEFAULT_DOSSIER_OPTIONS);
  const [incomeOptions, setIncomeOptions] = useState<IncomeReportOptions>(() =>
    defaultIncomeOptions(today),
  );
  const [revenueOptions, setRevenueOptions] = useState<RevenueReportOptions>(() =>
    defaultRevenueOptions(today),
  );
  const [clinicalOptions, setClinicalOptions] = useState<ClinicalReportOptions>(() =>
    defaultClinicalOptions(today),
  );
  const [rosterOptions, setRosterOptions] = useState<RosterReportOptions>(DEFAULT_ROSTER_OPTIONS);

  const monthlyRevenue = useMemo(() => {
    return state.bills.reduce<Record<string, number>>((acc, b) => {
      const k = b.date.slice(0, 7);
      acc[k] = (acc[k] ?? 0) + b.amountPaid;
      return acc;
    }, {});
  }, [state.bills]);

  const consultationsByDoctor = useMemo(() => {
    return state.consultations.reduce<Record<string, number>>((acc, c) => {
      acc[c.doctor] = (acc[c.doctor] ?? 0) + 1;
      return acc;
    }, {});
  }, [state.consultations]);

  const doctorNames = useMemo(
    () => Object.keys(consultationsByDoctor).sort(),
    [consultationsByDoctor],
  );

  const activePatient = useMemo(() => {
    return state.patients.find((p) => p.id === selectedPatientId) || state.patients[0];
  }, [state.patients, selectedPatientId]);

  const patientConsultations = useMemo(() => {
    if (!activePatient) return [];
    return state.consultations
      .filter((c) => c.patientId === activePatient.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.consultations, activePatient]);

  const patientBills = useMemo(() => {
    if (!activePatient) return [];
    return state.bills
      .filter((b) => b.patientId === activePatient.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.bills, activePatient]);

  const rosterList = usePaginatedList(state.patients, 50);

  const patientStats = useMemo(() => {
    const totalConsultations = patientConsultations.length;
    const totalBilled = patientBills.reduce(
      (sum, b) => sum + b.amountPaid + b.philhealthDeduction,
      0,
    );
    const totalPhilhealth = patientBills.reduce((sum, b) => sum + b.philhealthDeduction, 0);
    const totalPaid = patientBills.reduce((sum, b) => sum + b.amountPaid, 0);
    return { totalConsultations, totalBilled, totalPhilhealth, totalPaid };
  }, [patientConsultations, patientBills]);

  const aggregateDaily = (bills: Bill[], start?: string, end?: string): IncomeRow[] => {
    const map: Record<string, IncomeRow> = {};
    bills.forEach((b) => {
      const d = (b.date || "").slice(0, 10);
      if (!d) return;
      if (start && d < start) return;
      if (end && d > end) return;
      const gross = (b.items || []).reduce((s, it) => s + (it.amount || 0), 0);
      const ded = b.philhealthDeduction || 0;
      const paid = b.amountPaid || 0;
      if (!map[d]) map[d] = { label: d, gross: 0, deduction: 0, net: 0, paid: 0, count: 0 };
      map[d].gross += gross;
      map[d].deduction += ded;
      map[d].net += Math.max(0, gross - ded);
      map[d].paid += paid;
      map[d].count += 1;
    });
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  };

  const aggregateMonthly = (bills: Bill[], start?: string, end?: string): IncomeRow[] => {
    const map: Record<string, IncomeRow> = {};
    bills.forEach((b) => {
      if (!b.date) return;
      const dt = new Date(b.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (start && key < start) return;
      if (end && key > end) return;
      const gross = (b.items || []).reduce((s, it) => s + (it.amount || 0), 0);
      const ded = b.philhealthDeduction || 0;
      const paid = b.amountPaid || 0;
      if (!map[key]) map[key] = { label: key, gross: 0, deduction: 0, net: 0, paid: 0, count: 0 };
      map[key].gross += gross;
      map[key].deduction += ded;
      map[key].net += Math.max(0, gross - ded);
      map[key].paid += paid;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  };

  const aggregateYearly = (bills: Bill[], startY?: number, endY?: number): IncomeRow[] => {
    const map: Record<string, IncomeRow> = {};
    bills.forEach((b) => {
      if (!b.date) return;
      const y = new Date(b.date).getFullYear();
      if (startY && y < startY) return;
      if (endY && y > endY) return;
      const key = String(y);
      const gross = (b.items || []).reduce((s, it) => s + (it.amount || 0), 0);
      const ded = b.philhealthDeduction || 0;
      const paid = b.amountPaid || 0;
      if (!map[key]) map[key] = { label: key, gross: 0, deduction: 0, net: 0, paid: 0, count: 0 };
      map[key].gross += gross;
      map[key].deduction += ded;
      map[key].net += Math.max(0, gross - ded);
      map[key].paid += paid;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  };

  const buildReportForKind = (kind: ReportKind): ActiveReport | null => {
    if (kind === "dossier") {
      if (!activePatient) return null;
      return buildDossierReport(dossierOptions, activePatient);
    }
    if (kind === "income") return buildIncomeReport(incomeOptions);
    if (kind === "revenue") return buildRevenueReport(revenueOptions);
    if (kind === "clinical") return buildClinicalReport(clinicalOptions);
    if (kind === "roster") return buildRosterReport(rosterOptions);
    return null;
  };

  const openReportPreview = (kind: ReportKind) => {
    if (kind === "dossier" && !activePatient) {
      toast.error("Select a patient first");
      return;
    }
    setActiveKind(kind);
    const report = buildReportForKind(kind);
    if (!report) return;
    setActiveReport(report);
    setPreviewOpen(true);
  };

  const openPrintOptions = () => {
    if (!activeKind) return;
    setOptionsOpen(true);
  };

  const buildDossierReport = (opts: DossierReportOptions, patient: Patient): ActiveReport => {
    const generatedAt = new Date().toLocaleString();
    const showClinical = opts.sections === "clinical" || opts.sections === "both";
    const showFinancial = opts.sections === "financial" || opts.sections === "both";
    const consultations = state.consultations
      .filter((c) => c.patientId === patient.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const bills = state.bills
      .filter((b) => b.patientId === patient.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    const body = (
      <ReportDocument
        hospitalName={state.hospital.name}
        hospitalAddress={state.hospital.address}
        title="Patient Dossier Report"
        status={opts.status}
        generatedAt={generatedAt}
      >
        <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-semibold">Patient: </span>
            {patient.lastName}, {patient.firstName}
          </div>
          <div>
            <span className="font-semibold">DOB: </span>
            {patient.birthDate}
          </div>
          <div>
            <span className="font-semibold">Gender: </span>
            {patient.gender}
          </div>
          <div>
            <span className="font-semibold">Contact: </span>
            {patient.contactNumber}
          </div>
          {opts.includePhilHealthPin ? (
            <div className="col-span-2">
              <span className="font-semibold">PhilHealth PIN: </span>
              {patient.philhealth?.memberNumber || "N/A"}
            </div>
          ) : null}
        </div>

        {showClinical ? (
          <div className="mb-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide">Clinical Encounters</h3>
            <ReportTable
              headers={["Date", "Doctor", "Chief Complaint", "Diagnosis"]}
              rows={consultations.map((c) => [c.date, c.doctor, c.chiefComplaint, c.diagnosis])}
            />
          </div>
        ) : null}

        {showFinancial ? (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide">Financial Ledger</h3>
            <ReportTable
              headers={["Date", "Total Billed", "PhilHealth", "Amount Paid", "Status"]}
              rows={bills.map((b) => [
                b.date,
                money(b.amountPaid + b.philhealthDeduction),
                money(b.philhealthDeduction),
                money(b.amountPaid),
                b.status,
              ])}
            />
          </div>
        ) : null}
      </ReportDocument>
    );

    return {
      kind: "dossier",
      title: "Patient Dossier Preview",
      subtitle: `${patient.lastName}, ${patient.firstName} · ${opts.status} · ${opts.sections}`,
      body,
    };
  };

  const buildIncomeReport = (opts: IncomeReportOptions): ActiveReport | null => {
    const candidateBills = state.bills.filter((b) => {
      if (opts.patientType !== "All" && b.patientType !== opts.patientType) return false;
      if (opts.paymentMethod !== "All" && (b.paymentMethod || "Cash") !== opts.paymentMethod)
        return false;
      return true;
    });

    let rows: IncomeRow[] = [];
    let title = "";

    if (opts.periodType === "daily") {
      if (!opts.startDate || !opts.endDate) {
        toast.error("Select start/end dates");
        return null;
      }
      rows = aggregateDaily(candidateBills, opts.startDate, opts.endDate);
      title = `Daily Income ${opts.startDate} to ${opts.endDate}`;
    } else if (opts.periodType === "monthly") {
      rows = aggregateMonthly(candidateBills, opts.startMonth, opts.endMonth);
      title = `Monthly Income ${opts.startMonth} to ${opts.endMonth}`;
    } else {
      rows = aggregateYearly(candidateBills, opts.startYear, opts.endYear);
      title = `Yearly Income ${opts.startYear} to ${opts.endYear}`;
    }

    const filters: string[] = [];
    if (opts.patientType !== "All") filters.push(`PatientType=${opts.patientType}`);
    if (opts.paymentMethod !== "All") filters.push(`Payment=${opts.paymentMethod}`);
    if (filters.length) title += ` (${filters.join(", ")})`;

    const generatedAt = new Date().toLocaleString();
    const totals = rows.reduce(
      (acc, r) => ({
        count: acc.count + r.count,
        gross: acc.gross + r.gross,
        deduction: acc.deduction + r.deduction,
        net: acc.net + r.net,
        paid: acc.paid + r.paid,
      }),
      { count: 0, gross: 0, deduction: 0, net: 0, paid: 0 },
    );

    const tableRows =
      opts.viewMode === "summary"
        ? [
            [
              "Total",
              String(totals.count),
              money(totals.gross),
              money(totals.deduction),
              money(totals.net),
              money(totals.paid),
            ],
          ]
        : rows.map((r, i) => [
            String(i + 1),
            r.label,
            String(r.count),
            money(r.gross),
            money(r.deduction),
            money(r.net),
            money(r.paid),
          ]);

    const headers =
      opts.viewMode === "summary"
        ? ["Group", "Count", "Gross", "PhilHealth", "Net", "Paid"]
        : ["#", "Group", "Count", "Gross", "PhilHealth", "Net", "Paid"];

    const body = (
      <ReportDocument
        hospitalName={state.hospital.name}
        hospitalAddress={state.hospital.address}
        title={title}
        status={opts.status}
        generatedAt={generatedAt}
      >
        <ReportTable headers={headers} rows={tableRows} />
      </ReportDocument>
    );

    return {
      kind: "income",
      title: "Income Report Preview",
      subtitle: `${title} · ${opts.status} · ${opts.viewMode}`,
      body,
    };
  };

  const buildRevenueReport = (opts: RevenueReportOptions): ActiveReport => {
    const generatedAt = new Date().toLocaleString();
    const months = Object.entries(monthlyRevenue)
      .filter(([m]) => m >= opts.startMonth && m <= opts.endMonth)
      .sort(([a], [b]) => a.localeCompare(b));

    let headers: string[];
    let rows: (string | number)[][];

    if (opts.viewMode === "details") {
      headers = ["Date", "Patient", "Paid", "PhilHealth", "Status"];
      const bills = state.bills
        .filter((b) => {
          const m = b.date.slice(0, 7);
          return m >= opts.startMonth && m <= opts.endMonth;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      rows = bills.map((b) => {
        const p = state.patients.find((x) => x.id === b.patientId);
        return [
          b.date,
          p ? `${p.lastName}, ${p.firstName}` : "—",
          money(b.amountPaid),
          money(b.philhealthDeduction),
          b.status,
        ];
      });
    } else {
      headers = ["Month", "Revenue"];
      rows = months.map(([m, v]) => [m, money(v)]);
    }

    const title = `Monthly Revenue Summary (${opts.startMonth} to ${opts.endMonth})`;
    const body = (
      <ReportDocument
        hospitalName={state.hospital.name}
        hospitalAddress={state.hospital.address}
        title={title}
        status={opts.status}
        generatedAt={generatedAt}
      >
        <ReportTable headers={headers} rows={rows} />
      </ReportDocument>
    );

    return {
      kind: "revenue",
      title: "Monthly Revenue Preview",
      subtitle: `${opts.startMonth} – ${opts.endMonth} · ${opts.status} · ${opts.viewMode}`,
      body,
    };
  };

  const buildClinicalReport = (opts: ClinicalReportOptions): ActiveReport => {
    const generatedAt = new Date().toLocaleString();
    const filtered = state.consultations.filter((c: Consultation) => {
      if (c.date < opts.startDate || c.date > opts.endDate) return false;
      if (opts.doctor !== "All" && c.doctor !== opts.doctor) return false;
      return true;
    });

    let headers: string[];
    let rows: (string | number)[][];

    if (opts.viewMode === "details") {
      headers = ["Date", "Doctor", "Patient", "Diagnosis"];
      rows = filtered
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((c) => {
          const p = state.patients.find((x) => x.id === c.patientId);
          return [c.date, c.doctor, p ? `${p.lastName}, ${p.firstName}` : "—", c.diagnosis];
        });
    } else {
      const byDoctor = filtered.reduce<Record<string, number>>((acc, c) => {
        acc[c.doctor] = (acc[c.doctor] ?? 0) + 1;
        return acc;
      }, {});
      headers = ["Doctor", "Consultations"];
      rows = Object.entries(byDoctor)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, n]) => [d, n]);
    }

    const title = `Consultations by Provider (${opts.startDate} to ${opts.endDate})`;
    const body = (
      <ReportDocument
        hospitalName={state.hospital.name}
        hospitalAddress={state.hospital.address}
        title={title}
        status={opts.status}
        generatedAt={generatedAt}
      >
        <ReportTable headers={headers} rows={rows} />
      </ReportDocument>
    );

    return {
      kind: "clinical",
      title: "Consultations Report Preview",
      subtitle: `${opts.startDate} – ${opts.endDate} · ${opts.status} · ${opts.viewMode}`,
      body,
    };
  };

  const buildRosterReport = (opts: RosterReportOptions): ActiveReport => {
    const generatedAt = new Date().toLocaleString();
    const patients = state.patients.filter((p) => {
      if (opts.statusFilter === "active") return !p.archived;
      if (opts.statusFilter === "archived") return Boolean(p.archived);
      return true;
    });

    let headers: string[];
    let rows: (string | number)[][];

    if (opts.viewMode === "summary") {
      headers = ["Name", "Status"];
      rows = patients.map((p) => [
        `${p.lastName}, ${p.firstName}`,
        p.archived ? "Archived" : "Active",
      ]);
    } else {
      headers = opts.includePhilHealthPin
        ? ["Name", "Gender", "DOB", "Contact", "PhilHealth PIN", "Status"]
        : ["Name", "Gender", "DOB", "Contact", "Status"];
      rows = patients.map((p) => {
        const base = [`${p.lastName}, ${p.firstName}`, p.gender, p.birthDate, p.contactNumber];
        if (opts.includePhilHealthPin) {
          base.push(p.philhealth?.memberNumber || "—");
        }
        base.push(p.archived ? "Archived" : "Active");
        return base;
      });
    }

    const title = "Patient Registry Roster";
    const body = (
      <ReportDocument
        hospitalName={state.hospital.name}
        hospitalAddress={state.hospital.address}
        title={title}
        status={opts.status}
        generatedAt={generatedAt}
      >
        <ReportTable headers={headers} rows={rows} />
      </ReportDocument>
    );

    return {
      kind: "roster",
      title: "Patient Roster Preview",
      subtitle: `${opts.statusFilter} · ${opts.status} · ${opts.viewMode}`,
      body,
    };
  };

  const handleOptionsConfirm = () => {
    if (!activeKind) return;

    const report = buildReportForKind(activeKind);
    if (!report) {
      if (activeKind === "dossier") toast.error("Select a patient first");
      return;
    }

    setActiveReport(report);
    setOptionsOpen(false);
    setPreviewOpen(true);
  };

  const runPrint = () => {
    setPreviewOpen(false);
    setTimeout(() => window.print(), 150);
  };

  const optionsTitle =
    activeKind === "dossier"
      ? "Print Option — Patient Dossier"
      : activeKind === "income"
        ? "Print Option — Income Report"
        : activeKind === "revenue"
          ? "Print Option — Monthly Revenue"
          : activeKind === "clinical"
            ? "Print Option — Consultations"
            : activeKind === "roster"
              ? "Print Option — Patient Roster"
              : "Print Option";

  const statusField = (
    opts: { status: ReportPrintStatus },
    set: (status: ReportPrintStatus) => void,
    name: string,
  ) => (
    <OptionSection
      label="Status"
      hint="Final = official copy. Tentative = draft preview with watermark."
    >
      <div className="grid grid-cols-2 gap-2">
        <RadioRow
          name={name}
          value={"Final" as ReportPrintStatus}
          selected={opts.status}
          label="Final"
          onSelect={set}
        />
        <RadioRow
          name={name}
          value={"Tentative" as ReportPrintStatus}
          selected={opts.status}
          label="Tentative"
          onSelect={set}
        />
      </div>
    </OptionSection>
  );

  const viewModeField = (
    opts: { viewMode: ReportViewMode },
    set: (viewMode: ReportViewMode) => void,
    name: string,
  ) => (
    <OptionSection label="View Mode" hint="Summary = totals only. Details = line-level rows.">
      <div className="space-y-1">
        <RadioRow
          name={name}
          value={"summary" as ReportViewMode}
          selected={opts.viewMode}
          label="Summary"
          onSelect={set}
        />
        <RadioRow
          name={name}
          value={"details" as ReportViewMode}
          selected={opts.viewMode}
          label="Details"
          onSelect={set}
        />
      </div>
    </OptionSection>
  );

  return (
    <div>
      <style>{getReportPrintCss()}</style>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive operational, clinical, and detailed patient dossier reports."
      />
      <div className="space-y-6 p-6 no-print">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full max-w-2xl grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="dossier" className="text-xs">
              Patient Dossier
            </TabsTrigger>
            <TabsTrigger value="overview" className="text-xs">
              Practice Overview
            </TabsTrigger>
            <TabsTrigger value="roster" className="text-xs">
              Patient Roster
            </TabsTrigger>
            <TabsTrigger value="income" className="text-xs">
              Income Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dossier" className="space-y-4">
            <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <PatientSearchWithHistory
                    patients={state.patients}
                    selectedPatientId={selectedPatientId}
                    onSelect={setSelectedPatientId}
                    label="Select Patient for Detailed Report"
                    showArchived
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => openReportPreview("dossier")}
                  className="h-9 shrink-0 bg-slate-800 text-xs text-white hover:bg-slate-700"
                  disabled={!activePatient}
                >
                  <Printer className="mr-1 h-3.5 w-3.5" /> Generate Report
                </Button>
              </div>
            </div>

            {activePatient && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Card className="bg-slate-900 text-white md:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-400" />
                        <div>
                          <CardTitle className="text-lg font-bold">
                            {activePatient.lastName}, {activePatient.firstName}
                          </CardTitle>
                          <CardDescription className="text-xs text-blue-200">
                            Patient Health Registry Dossier
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-800 pt-2 text-xs">
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-slate-400">
                          Date of Birth
                        </span>
                        <span>{activePatient.birthDate}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-slate-400">
                          Gender
                        </span>
                        <span>{activePatient.gender}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-slate-400">
                          Contact
                        </span>
                        <span>{activePatient.contactNumber}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-slate-400">
                          PhilHealth PIN
                        </span>
                        <span className="font-mono font-bold text-blue-300">
                          {activePatient.philhealth?.memberNumber || "Not Enrolled"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border bg-card">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Clinical Visits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-center pt-2">
                      <span className="text-3xl font-extrabold text-foreground">
                        {patientStats.totalConsultations}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3 text-blue-500" /> Consultations recorded
                      </span>
                    </CardContent>
                  </Card>

                  <Card className="border border-border bg-card">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Financial Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <span className="text-3xl font-extrabold text-emerald-600">
                        ₱{patientStats.totalPaid.toLocaleString()}
                      </span>
                      <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Total Billed:</span>
                          <span className="font-semibold text-foreground">
                            ₱{patientStats.totalBilled.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>PhilHealth Cover:</span>
                          <span className="font-semibold text-blue-600">
                            ₱{patientStats.totalPhilhealth.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="border-b pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <ClipboardList className="h-4 w-4 text-blue-600" /> Clinical History
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Summary of clinical findings and diagnoses.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Diagnosis</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientConsultations.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="whitespace-nowrap font-mono text-[10px]">
                                {c.date}
                              </TableCell>
                              <TableCell className="font-medium">{c.doctor}</TableCell>
                              <TableCell>
                                <div className="text-xs font-bold">{c.diagnosis}</div>
                                <div
                                  className="max-w-[220px] truncate text-[10px] text-muted-foreground"
                                  title={c.chiefComplaint}
                                >
                                  CC: {c.chiefComplaint}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {patientConsultations.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="py-10 text-center text-xs text-muted-foreground"
                              >
                                No consultations on record.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <CreditCard className="h-4 w-4 text-emerald-600" /> Financial Ledger
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Payments, PhilHealth coverage, and outstanding balances.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead className="text-right">PhilHealth</TableHead>
                            <TableHead className="text-right">Cash Paid</TableHead>
                            <TableHead className="text-right">Total Fee</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientBills.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="whitespace-nowrap font-mono text-[10px]">
                                {b.date}
                              </TableCell>
                              <TableCell className="text-right font-medium text-blue-600">
                                ₱{b.philhealthDeduction.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-medium text-emerald-600">
                                ₱{b.amountPaid.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                ₱{(b.amountPaid + b.philhealthDeduction).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                          {patientBills.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-10 text-center text-xs text-muted-foreground"
                              >
                                No billing records on file.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="text-sm font-bold">Income Reports</CardTitle>
                  <CardDescription className="text-xs">
                    Daily, monthly, or yearly income totals. Choose options, then preview before
                    printing.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => openReportPreview("income")}
                  className="h-9 bg-slate-800 text-xs text-white hover:bg-slate-700"
                >
                  <Printer className="mr-1 h-3.5 w-3.5" /> Generate Report
                </Button>
              </CardHeader>
              <CardContent className="pt-4 text-sm text-muted-foreground">
                Click Generate Report to open a preview. Use Print Options… in the preview to change
                period, filters, or summary/details before printing or saving as PDF.
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Monthly Revenue Summary
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Practice totals by calendar month.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReportPreview("revenue")}
                    className="h-7 px-2 text-[10px]"
                  >
                    <Printer className="mr-1 h-3 w-3" /> Generate Report
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(monthlyRevenue)
                        .sort()
                        .map(([k, v]) => (
                          <TableRow key={k}>
                            <TableCell className="text-xs font-semibold">{k}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-foreground">
                              ₱
                              {v.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      {Object.keys(monthlyRevenue).length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-8 text-center text-xs text-muted-foreground"
                          >
                            No revenue records yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-bold">
                      <ShieldCheck className="h-4 w-4 text-blue-600" /> Consultations by Provider
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Visit count distribution by physician.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReportPreview("clinical")}
                    className="h-7 px-2 text-[10px]"
                  >
                    <Printer className="mr-1 h-3 w-3" /> Generate Report
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Consultations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(consultationsByDoctor).map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell className="text-xs font-semibold">{k}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">
                            {v}
                          </TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(consultationsByDoctor).length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="py-8 text-center text-xs text-muted-foreground"
                          >
                            No clinical records yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="roster">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Patient Registry Roster
                  </CardTitle>
                  <CardDescription className="text-xs">
                    List of patients currently registered in the hospital system.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReportPreview("roster")}
                  className="h-9 text-xs"
                >
                  <Printer className="mr-1 h-3.5 w-3.5" /> Generate Report
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>PhilHealth PIN</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterList.pageItems.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-semibold">
                          {p.lastName}, {p.firstName}
                        </TableCell>
                        <TableCell>{p.gender}</TableCell>
                        <TableCell className="font-mono text-[11px]">{p.birthDate}</TableCell>
                        <TableCell className="font-mono text-[11px]">{p.contactNumber}</TableCell>
                        <TableCell className="font-mono text-[11px] font-bold text-blue-600">
                          {p.philhealth?.memberNumber || "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              p.archived
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-500/15 text-emerald-600"
                            }`}
                          >
                            {p.archived ? "Archived" : "Active"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ListPagination
                  page={rosterList.page}
                  totalPages={rosterList.totalPages}
                  totalItems={rosterList.totalItems}
                  onPageChange={rosterList.setPage}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ReportPrintOptionsModal
        open={optionsOpen}
        title={optionsTitle}
        confirmLabel="Apply"
        onCancel={() => setOptionsOpen(false)}
        onConfirm={handleOptionsConfirm}
      >
        {activeKind === "dossier" && (
          <>
            {statusField(
              dossierOptions,
              (status) => setDossierOptions({ ...dossierOptions, status }),
              "dossier-status",
            )}
            <OptionSection
              label="Sections"
              hint="Choose which dossier sections appear on the report."
            >
              <div className="space-y-1">
                <RadioRow
                  name="dossier-sections"
                  value="clinical"
                  selected={dossierOptions.sections}
                  label="Clinical History Only"
                  onSelect={(sections) => setDossierOptions({ ...dossierOptions, sections })}
                />
                <RadioRow
                  name="dossier-sections"
                  value="financial"
                  selected={dossierOptions.sections}
                  label="Financial Ledger Only"
                  onSelect={(sections) => setDossierOptions({ ...dossierOptions, sections })}
                />
                <RadioRow
                  name="dossier-sections"
                  value="both"
                  selected={dossierOptions.sections}
                  label="Clinical & Financial"
                  onSelect={(sections) => setDossierOptions({ ...dossierOptions, sections })}
                />
              </div>
            </OptionSection>
            <OptionSection label="Include">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                  checked={dossierOptions.includePhilHealthPin}
                  onChange={(e) =>
                    setDossierOptions({
                      ...dossierOptions,
                      includePhilHealthPin: e.target.checked,
                    })
                  }
                />
                <span>PhilHealth PIN</span>
              </label>
            </OptionSection>
          </>
        )}

        {activeKind === "income" && (
          <>
            {statusField(
              incomeOptions,
              (status) => setIncomeOptions({ ...incomeOptions, status }),
              "income-status",
            )}
            {viewModeField(
              incomeOptions,
              (viewMode) => setIncomeOptions({ ...incomeOptions, viewMode }),
              "income-view",
            )}
            <OptionSection label="Period Type">
              <div className="space-y-1">
                {(["daily", "monthly", "yearly"] as const).map((periodType) => (
                  <RadioRow
                    key={periodType}
                    name="income-period"
                    value={periodType}
                    selected={incomeOptions.periodType}
                    label={periodType.charAt(0).toUpperCase() + periodType.slice(1)}
                    onSelect={(v) => setIncomeOptions({ ...incomeOptions, periodType: v })}
                  />
                ))}
              </div>
            </OptionSection>
            {incomeOptions.periodType === "daily" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={incomeOptions.startDate}
                    onChange={(e) =>
                      setIncomeOptions({ ...incomeOptions, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={incomeOptions.endDate}
                    onChange={(e) =>
                      setIncomeOptions({ ...incomeOptions, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            {incomeOptions.periodType === "monthly" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start Month</Label>
                  <Input
                    type="month"
                    className="h-9 text-xs"
                    value={incomeOptions.startMonth}
                    onChange={(e) =>
                      setIncomeOptions({ ...incomeOptions, startMonth: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End Month</Label>
                  <Input
                    type="month"
                    className="h-9 text-xs"
                    value={incomeOptions.endMonth}
                    onChange={(e) =>
                      setIncomeOptions({ ...incomeOptions, endMonth: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            {incomeOptions.periodType === "yearly" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start Year</Label>
                  <Input
                    type="number"
                    min={2000}
                    className="h-9 text-xs"
                    value={String(incomeOptions.startYear)}
                    onChange={(e) =>
                      setIncomeOptions({
                        ...incomeOptions,
                        startYear: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End Year</Label>
                  <Input
                    type="number"
                    min={2000}
                    className="h-9 text-xs"
                    value={String(incomeOptions.endYear)}
                    onChange={(e) =>
                      setIncomeOptions({
                        ...incomeOptions,
                        endYear: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Patient Type</Label>
                <Select
                  value={incomeOptions.patientType}
                  onValueChange={(patientType) =>
                    setIncomeOptions({ ...incomeOptions, patientType })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["All", "In-Patient", "Out-Patient", "ER", "OPD", "Dialysis"].map((v) => (
                      <SelectItem key={v} value={v} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <Select
                  value={incomeOptions.paymentMethod}
                  onValueChange={(paymentMethod) =>
                    setIncomeOptions({ ...incomeOptions, paymentMethod })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["All", "Cash", "Card", "GCash", "Insurance", "Credit"].map((v) => (
                      <SelectItem key={v} value={v} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {activeKind === "revenue" && (
          <>
            {statusField(
              revenueOptions,
              (status) => setRevenueOptions({ ...revenueOptions, status }),
              "revenue-status",
            )}
            {viewModeField(
              revenueOptions,
              (viewMode) => setRevenueOptions({ ...revenueOptions, viewMode }),
              "revenue-view",
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start Month</Label>
                <Input
                  type="month"
                  className="h-9 text-xs"
                  value={revenueOptions.startMonth}
                  onChange={(e) =>
                    setRevenueOptions({ ...revenueOptions, startMonth: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End Month</Label>
                <Input
                  type="month"
                  className="h-9 text-xs"
                  value={revenueOptions.endMonth}
                  onChange={(e) =>
                    setRevenueOptions({ ...revenueOptions, endMonth: e.target.value })
                  }
                />
              </div>
            </div>
          </>
        )}

        {activeKind === "clinical" && (
          <>
            {statusField(
              clinicalOptions,
              (status) => setClinicalOptions({ ...clinicalOptions, status }),
              "clinical-status",
            )}
            {viewModeField(
              clinicalOptions,
              (viewMode) => setClinicalOptions({ ...clinicalOptions, viewMode }),
              "clinical-view",
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={clinicalOptions.startDate}
                  onChange={(e) =>
                    setClinicalOptions({ ...clinicalOptions, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={clinicalOptions.endDate}
                  onChange={(e) =>
                    setClinicalOptions({ ...clinicalOptions, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Doctor</Label>
              <Select
                value={clinicalOptions.doctor}
                onValueChange={(doctor) => setClinicalOptions({ ...clinicalOptions, doctor })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" className="text-xs">
                    All
                  </SelectItem>
                  {doctorNames.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {activeKind === "roster" && (
          <>
            {statusField(
              rosterOptions,
              (status) => setRosterOptions({ ...rosterOptions, status }),
              "roster-status",
            )}
            {viewModeField(
              rosterOptions,
              (viewMode) => setRosterOptions({ ...rosterOptions, viewMode }),
              "roster-view",
            )}
            <OptionSection label="Patient Status">
              <div className="space-y-1">
                <RadioRow
                  name="roster-filter"
                  value="all"
                  selected={rosterOptions.statusFilter}
                  label="All"
                  onSelect={(statusFilter) => setRosterOptions({ ...rosterOptions, statusFilter })}
                />
                <RadioRow
                  name="roster-filter"
                  value="active"
                  selected={rosterOptions.statusFilter}
                  label="Active Only"
                  onSelect={(statusFilter) => setRosterOptions({ ...rosterOptions, statusFilter })}
                />
                <RadioRow
                  name="roster-filter"
                  value="archived"
                  selected={rosterOptions.statusFilter}
                  label="Archived Only"
                  onSelect={(statusFilter) => setRosterOptions({ ...rosterOptions, statusFilter })}
                />
              </div>
            </OptionSection>
            <OptionSection label="Include">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                  checked={rosterOptions.includePhilHealthPin}
                  onChange={(e) =>
                    setRosterOptions({
                      ...rosterOptions,
                      includePhilHealthPin: e.target.checked,
                    })
                  }
                />
                <span>PhilHealth PIN</span>
              </label>
            </OptionSection>
          </>
        )}
      </ReportPrintOptionsModal>

      <ReportPreviewModal
        open={previewOpen && Boolean(activeReport)}
        title={activeReport?.title ?? "Report Preview"}
        subtitle={activeReport?.subtitle}
        onClose={() => setPreviewOpen(false)}
        onPrintOptions={openPrintOptions}
        onPrint={runPrint}
        onGeneratePdf={() => {
          toast.info("Use your browser’s print dialog and choose “Save as PDF”.");
          runPrint();
        }}
      >
        {activeReport?.body}
      </ReportPreviewModal>

      {/* Print-only area (mirrors active report body) */}
      <div id="report-print-area">{activeReport?.body}</div>
    </div>
  );
}
