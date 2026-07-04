import { getExpiringSoonItems, getLowStockItems } from "@/lib/services/inventoryService";
import { todayISO, type AppState, type Medicine } from "@/lib/store";

import { getTodayAppointments } from "./appointmentService";
import { getMonthlyConsultations, getTodayConsultations } from "./consultationService";

export type DashboardMetrics = {
  activePatientCount: number;
  newPatientsMTD: number;
  monthlyRevenue: number;
  todayRevenue: number;
  avgDailyRevenue: number;
  todayAppointmentCount: number;
  todayConsultationCount: number;
  monthlyConsultationCount: number;
  hasRevenue: boolean;
  chartData: { day: string; revenue: number }[];
  hasChartData: boolean;
  hasInventory: boolean;
  lowStockItems: Medicine[];
  expiringSoonItems: Medicine[];
  lowStockCount: number;
  expiringSoonCount: number;
  hasStockAlerts: boolean;
};

function buildRevenueByDate(transactions: AppState["cashierTransactions"]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.status !== "Paid") continue;
    map.set(t.transactionDate, (map.get(t.transactionDate) ?? 0) + t.amount);
  }
  return map;
}

export function computeDashboardMetrics(state: AppState, today = todayISO()): DashboardMetrics {
  const monthPrefix = today.slice(0, 7);
  const daysInMonth = new Date().getDate();

  let activePatientCount = 0;
  let newPatientsMTD = 0;
  for (const p of state.patients) {
    if (!p.archived) activePatientCount += 1;
    if (p.createdAt.startsWith(monthPrefix)) newPatientsMTD += 1;
  }

  const revenueByDate = buildRevenueByDate(state.cashierTransactions);
  const todayRevenue = revenueByDate.get(today) ?? 0;

  let monthlyRevenue = 0;
  let hasRevenue = false;
  for (const [date, amount] of revenueByDate) {
    if (amount > 0) hasRevenue = true;
    if (date.startsWith(monthPrefix)) monthlyRevenue += amount;
  }

  const avgDailyRevenue = daysInMonth ? Math.round(monthlyRevenue / daysInMonth) : 0;

  const todayAppts = getTodayAppointments(state.appointments, today);
  const todayCons = getTodayConsultations(state.consultations, today);
  const monthlyCons = getMonthlyConsultations(state.consultations, monthPrefix);

  const chartDays = 7;
  const chartData = Array.from({ length: chartDays }).map((_, i) => {
    const d = todayISO(-(chartDays - 1 - i));
    return { day: d.slice(5), revenue: revenueByDate.get(d) ?? 0 };
  });

  let hasInventory = false;
  for (const m of state.medicines) {
    if (!m.archived) {
      hasInventory = true;
      break;
    }
  }

  const lowStockItems = getLowStockItems(state.medicines);
  const expiringSoonItems = getExpiringSoonItems(state.medicines);

  return {
    activePatientCount,
    newPatientsMTD,
    monthlyRevenue,
    todayRevenue,
    avgDailyRevenue,
    todayAppointmentCount: todayAppts.length,
    todayConsultationCount: todayCons.length,
    monthlyConsultationCount: monthlyCons.length,
    hasRevenue,
    chartData,
    hasChartData: chartData.some((d) => d.revenue > 0),
    hasInventory,
    lowStockItems,
    expiringSoonItems,
    lowStockCount: lowStockItems.length,
    expiringSoonCount: expiringSoonItems.length,
    hasStockAlerts: lowStockItems.length > 0 || expiringSoonItems.length > 0,
  };
}

/** Lightweight fingerprint for dashboard cache invalidation. */
export function buildDashboardSnapshotKey(state: AppState, today = todayISO()): string {
  return [
    today,
    state.patients.length,
    state.appointments.length,
    state.consultations.length,
    state.cashierTransactions.length,
    state.medicines.length,
    state.bills.length,
    state.cashierTransactions.at(-1)?.id ?? "",
    state.patients.at(-1)?.id ?? "",
  ].join("|");
}
