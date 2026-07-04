import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Calendar, Stethoscope, Receipt, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { useDashboardMetrics } from "@/lib/hooks/useDashboardMetrics";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Hospital CMS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const metrics = useDashboardMetrics();

  const kpis = [
    {
      label: "Total Patients",
      value: metrics.activePatientCount,
      note: metrics.activePatientCount ? "Active records" : "No data yet",
      icon: Users,
    },
    {
      label: "Monthly Revenue",
      value: `₱${metrics.monthlyRevenue.toLocaleString()}`,
      note: metrics.hasRevenue ? "This month" : "No data yet",
      icon: TrendingUp,
    },
    {
      label: "Today's Revenue",
      value: `₱${metrics.todayRevenue.toLocaleString()}`,
      note: metrics.todayRevenue ? "Collected today" : "No data yet",
      icon: Receipt,
    },
    {
      label: "Avg Daily Revenue",
      value: `₱${metrics.avgDailyRevenue.toLocaleString()}`,
      note: metrics.hasRevenue ? "Month-to-date avg" : "No data yet",
      icon: TrendingUp,
    },
    {
      label: "Today's Appointments",
      value: metrics.todayAppointmentCount,
      note: metrics.todayAppointmentCount ? "Scheduled & confirmed" : "No data yet",
      icon: Calendar,
    },
    {
      label: "Today's OPD Visits",
      value: metrics.todayConsultationCount,
      note: metrics.todayConsultationCount ? "Seen today" : "No data yet",
      icon: Stethoscope,
    },
    {
      label: "Monthly OPD Visits",
      value: metrics.monthlyConsultationCount,
      note: metrics.monthlyConsultationCount ? "This month" : "No data yet",
      icon: Stethoscope,
    },
    {
      label: "New Patients (MTD)",
      value: metrics.newPatientsMTD,
      note: metrics.newPatientsMTD ? "Registered this month" : "No data yet",
      icon: Users,
    },
  ];

  const lowStock = metrics.lowStockItems;
  const expiringSoon = metrics.expiringSoonItems;

  return (
    <div>
      <PageHeader title="Dashboard" description="Real-time overview of hospital operations and financials." />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{k.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{k.note}</p>
                  </div>
                  <div className="rounded-md bg-accent/10 p-2 text-accent">
                    <k.icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">7-Day Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                {metrics.hasChartData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.chartData}>
                      <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning-foreground" /> Stock Alerts</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!metrics.hasInventory ? (
                <p className="text-muted-foreground">No data yet</p>
              ) : (
                <>
                  <div>
                    <p className="font-medium">Low Stock ({lowStock.length})</p>
                    {lowStock.length === 0 ? (
                      <p className="text-muted-foreground">All stock levels OK</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {lowStock.map((m) => (
                          <li key={m.id} className="flex justify-between"><span>{m.name}</span><span className="text-destructive">{m.stock}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Expiring &lt; 6mo ({expiringSoon.length})</p>
                    {expiringSoon.length === 0 ? (
                      <p className="text-muted-foreground">No items expiring soon</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {expiringSoon.slice(0, 4).map((m) => (
                          <li key={m.id} className="flex justify-between"><span>{m.name}</span><span className="text-warning-foreground">{m.expiry}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { to: "/patients", label: "Patients", icon: Users },
              { to: "/appointments", label: "Appointments", icon: Calendar },
              { to: "/opd", label: "OPD", icon: Stethoscope },
              { to: "/billing", label: "Billing", icon: Receipt },
            ].map((q) => (
              <Button key={q.to} asChild variant="outline" className="justify-between h-12">
                <Link to={q.to}>
                  <span className="flex items-center gap-2"><q.icon className="h-4 w-4" /> {q.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
