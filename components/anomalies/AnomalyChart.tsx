"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { CostAnomaly } from "@/lib/types";

type CostPoint = {
  date: string;
  totalCost: number;
};

type AnomalyChartProps = {
  data: CostPoint[];
  anomalies: CostAnomaly[];
};

export function AnomalyChart({ data, anomalies }: AnomalyChartProps) {
  const activeAnomalies = useMemo(() => anomalies.filter((anomaly) => !anomaly.resolved), [anomalies]);

  const anomalyDateToCost = useMemo(() => {
    const pointByDate = new Map(data.map((point) => [point.date, point.totalCost]));
    const map = new Map<string, number>();

    for (const anomaly of activeAnomalies) {
      const date = anomaly.detectedAt.slice(0, 10);
      const cost = pointByDate.get(date);
      if (typeof cost === "number") {
        map.set(date, cost);
      }
    }

    return map;
  }, [activeAnomalies, data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Cost With Anomaly Markers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value: string) => value.slice(5)}
                minTickGap={28}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                width={80}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value) => {
                  const numeric = typeof value === "number" ? value : Number(value ?? 0);
                  return [formatCurrency(numeric), "Total Cost"];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="totalCost"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />

              {Array.from(anomalyDateToCost.entries()).map(([date, cost]) => (
                <ReferenceDot
                  key={date}
                  x={date}
                  y={cost}
                  r={5}
                  fill="#ef4444"
                  stroke="#7f1d1d"
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
