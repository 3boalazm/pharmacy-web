"use client";
import { useQuery } from "@tanstack/react-query";
import { reportDaily, reportTop, getAbc } from "../api";
import { LineChart, BarChart, PieChart } from "@/components/ui/charts";
import { Card, CardHeader } from "@/components/ui/card";

function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** رسوم اللوحة — اتجاه المبيعات (Line) · الأكثر مبيعًا (Bar) · توزيع ABC (Pie). كله SVG نقي ببيانات حقيقية. */
export function DashboardCharts() {
  const from = isoDaysAgo(14), to = isoDaysAgo(0);

  const daily = useQuery({
    queryKey: ["dash.daily", from, to],
    queryFn: ({ signal }) => reportDaily({ from, to }, signal),
    select: (r) => r.data.map((d) => ({ label: new Date(d.day).toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" }), value: Number(d.total) })),
  });

  const top = useQuery({
    queryKey: ["dash.top", from, to],
    queryFn: ({ signal }) => reportTop({ from, to }, signal),
    select: (r) => r.data.slice(0, 6).map((m) => ({ label: m.nameAr, value: Number(m.revenue) })),
  });

  const abc = useQuery({
    queryKey: ["dash.abc"],
    queryFn: ({ signal }) => getAbc(90, signal),
    select: (r) => [
      { label: "أصناف A", value: r.data.summary.counts.A },
      { label: "أصناف B", value: r.data.summary.counts.B },
      { label: "أصناف C", value: r.data.summary.counts.C },
    ],
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader title="اتجاه المبيعات — آخر ١٤ يوم" />
        <div className="p-4">
          {daily.isLoading ? <Skel /> : <LineChart data={daily.data ?? []} />}
        </div>
      </Card>

      <Card>
        <CardHeader title="الأكثر مبيعًا (إيرادًا)" />
        <div className="p-4">
          {top.isLoading ? <Skel /> : <BarChart data={top.data ?? []} />}
        </div>
      </Card>

      <Card>
        <CardHeader title="توزيع الأصناف (ABC)" />
        <div className="p-4">
          {abc.isLoading ? <Skel /> : <PieChart data={abc.data ?? []} />}
        </div>
      </Card>
    </div>
  );
}

function Skel() {
  return <div className="h-44 animate-pulse rounded-card bg-paper" />;
}
