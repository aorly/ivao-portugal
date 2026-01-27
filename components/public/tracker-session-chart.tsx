"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Props = {
  labels: string[];
  altitude: Array<number | null>;
  groundSpeed: Array<number | null>;
  terrain: Array<number | null>;
};

const toSeries = (values: Array<number | null>) => values.map((value) => (value === null ? null : value));

export function TrackerSessionChart({ labels, altitude, groundSpeed, terrain }: Props) {
  const series = useMemo(
    () => [
      { name: "Altitude (ft)", type: "area", data: toSeries(altitude), yAxisIndex: 0 },
      { name: "Ground speed (kt)", type: "line", data: toSeries(groundSpeed), yAxisIndex: 1 },
      { name: "Terrain (ft)", type: "area", data: toSeries(terrain), yAxisIndex: 2 },
    ],
    [altitude, groundSpeed, terrain],
  );

  const altitudeRange = useMemo(() => {
    const combined = [...altitude, ...terrain].filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
    if (combined.length === 0) return { min: 0, max: 0 };
    const min = Math.min(...combined);
    const max = Math.max(...combined);
    return { min, max };
  }, [altitude, terrain]);

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "line",
        height: 220,
        toolbar: { show: false },
        animations: { enabled: true, speed: 350 },
        zoom: { enabled: false },
      },
      stroke: {
        curve: "smooth",
        width: [2.5, 2.5, 2],
      },
      fill: {
        type: ["gradient", "solid", "gradient"],
        gradient: {
          shadeIntensity: 0.3,
          opacityFrom: 0.28,
          opacityTo: 0.04,
          stops: [0, 85, 100],
        },
      },
      colors: ["#38bdf8", "#f97316", "#8b5e3c"],
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: {
        borderColor: "rgba(203, 213, 245, 0.25)",
        strokeDashArray: 4,
      },
      xaxis: {
        categories: labels,
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      yaxis: [
        {
          min: altitudeRange.min,
          max: altitudeRange.max,
          labels: { show: false },
        },
        {
          opposite: true,
          labels: { show: false },
        },
        {
          min: altitudeRange.min,
          max: altitudeRange.max,
          labels: { show: false },
          show: false,
        },
      ],
      tooltip: {
        shared: true,
        intersect: false,
        x: {
          formatter: (_value, opts) => {
            const index = opts?.dataPointIndex ?? 0;
            return `${labels[index] ?? "--:--"} UTC`;
          },
        },
        y: {
          formatter: (value, { seriesIndex }) => {
            if (value === null || value === undefined) return "-";
            if (seriesIndex === 1) return `${Math.round(value)} kt`;
            return `${Math.round(value)} ft`;
          },
        },
      },
    }),
    [labels, altitudeRange.min, altitudeRange.max],
  );

  return (
    <div className="h-52 w-full">
      <Chart options={options} series={series} type="line" height={208} />
    </div>
  );
}
