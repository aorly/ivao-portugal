"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type MonthlySeries = {
  labels: string[];
  pilot: number[];
  atc: number[];
  total: number[];
  pilotHours: number[];
  atcHours: number[];
};

type Props = {
  monthly: MonthlySeries;
  share: { pilot: number; atc: number };
};

export function ProfileStatsCharts({ monthly, share }: Props) {
  const monthlyOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "bar",
        stacked: true,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: { columnWidth: "45%", borderRadius: 4 },
      },
      dataLabels: { enabled: false },
      colors: ["#38bdf8", "#f97316"],
      legend: { show: false },
      xaxis: {
        categories: monthly.labels,
        labels: { style: { colors: "var(--text-muted)" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: "var(--text-muted)" } },
      },
      grid: {
        borderColor: "rgba(148, 163, 184, 0.25)",
      },
      tooltip: {
        y: { formatter: (value) => `${Math.round(value)} sessions` },
      },
    }),
    [monthly.labels],
  );

  const monthlySeries = useMemo(
    () => [
      { name: "Pilot", data: monthly.pilot },
      { name: "ATC", data: monthly.atc },
    ],
    [monthly],
  );

  const hoursOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "line",
        toolbar: { show: false },
      },
      stroke: { curve: "smooth", width: 3 },
      colors: ["#0ea5e9", "#fb923c"],
      dataLabels: { enabled: false },
      xaxis: {
        categories: monthly.labels,
        labels: { style: { colors: "var(--text-muted)" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { style: { colors: "var(--text-muted)" } },
      },
      grid: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      tooltip: {
        y: { formatter: (value) => `${Math.round(value)} h` },
      },
    }),
    [monthly.labels],
  );

  const hoursSeries = useMemo(
    () => [
      { name: "Pilot hours", data: monthly.pilotHours },
      { name: "ATC hours", data: monthly.atcHours },
    ],
    [monthly],
  );

  const shareOptions = useMemo<ApexOptions>(
    () => ({
      chart: { type: "donut" },
      labels: ["Pilot", "ATC"],
      colors: ["#38bdf8", "#fb923c"],
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      tooltip: {
        y: { formatter: (value) => `${Math.round(value)} sessions` },
      },
    }),
    [],
  );

  const shareSeries = useMemo(() => [share.pilot, share.atc], [share]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Monthly sessions</p>
        <Chart options={monthlyOptions} series={monthlySeries} type="bar" height={320} />
      </div>
      <div className="grid gap-4">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Sessions split</p>
          <Chart options={shareOptions} series={shareSeries} type="donut" height={180} />
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Monthly hours</p>
          <Chart options={hoursOptions} series={hoursSeries} type="line" height={200} />
        </div>
      </div>
    </div>
  );
}
