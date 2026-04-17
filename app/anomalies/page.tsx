"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AnomalyChart } from "@/components/anomalies/AnomalyChart";
import { CloudConnectionNotice } from "@/components/layout/CloudConnectionNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CostAnomaly } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type CostsResponse = {
  data?: Array<{ date: string; totalCost: number }>;
  error?: string;
};

type AnomaliesResponse = {
  anomalies?: CostAnomaly[];
  error?: string;
};

type ConnectRequiredResponse = {
  error?: string;
  requiresConnection?: boolean;
  connectPath?: string;
};

export default function AnomaliesPage() {
  const [costData, setCostData] = React.useState<Array<{ date: string; totalCost: number }>>([]);
  const [anomalies, setAnomalies] = React.useState<CostAnomaly[]>([]);
  const [resolvedIds, setResolvedIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [connectRequired, setConnectRequired] = React.useState<ConnectRequiredResponse | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const [costsRes, anomaliesRes] = await Promise.all([
          fetch("/api/costs?period=90d&groupBy=service", { cache: "no-store" }),
          fetch("/api/anomalies", { cache: "no-store" }),
        ]);

        const blockedResponse = [costsRes, anomaliesRes].find((response) => response.status === 412);

        if (blockedResponse) {
          const payload = (await blockedResponse.json().catch(() => ({}))) as ConnectRequiredResponse;
          setConnectRequired({
            error: payload.error,
            requiresConnection: true,
            connectPath: payload.connectPath ?? "/settings/cloud",
          });
          setCostData([]);
          setAnomalies([]);
          return;
        }

        const costsPayload = (await costsRes.json()) as CostsResponse;
        const anomaliesPayload = (await anomaliesRes.json()) as AnomaliesResponse;

        if (!costsRes.ok) {
          throw new Error(costsPayload.error ?? "Failed to load cost series");
        }

        if (!anomaliesRes.ok) {
          throw new Error(anomaliesPayload.error ?? "Failed to load anomalies");
        }

        setCostData(costsPayload.data ?? []);
        setAnomalies(anomaliesPayload.anomalies ?? []);
  setConnectRequired(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load anomalies";
        toast.error("Unable to load anomalies", { description: message });
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const visibleAnomalies = React.useMemo(
    () => anomalies.filter((item) => !item.resolved && !resolvedIds.has(item.id)),
    [anomalies, resolvedIds]
  );

  const handleResolve = (id: string) => {
    setResolvedIds((current) => new Set([...current, id]));
    toast.success("Anomaly marked as resolved");
  };

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cost Anomalies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spike detection against rolling baseline with resource-level causes.
          </p>
        </div>
        <Badge variant={visibleAnomalies.length > 0 ? "destructive" : "secondary"}>
          {visibleAnomalies.length} active anomalies
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Loading anomaly data...</p>
          <Skeleton className="h-[360px] rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        </div>
      ) : connectRequired?.requiresConnection ? (
        <CloudConnectionNotice
          message={connectRequired.error}
          connectPath={connectRequired.connectPath}
        />
      ) : (
        <>
          <AnomalyChart data={costData} anomalies={visibleAnomalies} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleAnomalies.length === 0 ? (
              <Card>
                <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  No active anomalies right now.
                </CardContent>
              </Card>
            ) : (
              visibleAnomalies.map((anomaly) => (
                <Card key={anomaly.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start justify-between gap-2 text-base">
                      <span className="line-clamp-1">{anomaly.resourceName}</span>
                      <Badge variant="destructive" className="shrink-0">
                        <AlertTriangle className="size-3.5" />
                        +{Math.round(anomaly.spikePercent)}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{formatDate(anomaly.detectedAt)} · {anomaly.team} · {anomaly.service.toUpperCase()}</p>
                    <p>
                      Baseline <span className="font-mono">{formatCurrency(anomaly.baselineCost)}</span> vs actual{" "}
                      <span className="font-mono">{formatCurrency(anomaly.actualCost)}</span>
                    </p>
                    <p className="font-medium text-destructive">Extra spend: {formatCurrency(anomaly.estimatedExtra)}</p>
                    <p className="text-muted-foreground">{anomaly.possibleCause}</p>
                    <Button size="sm" variant="outline" onClick={() => handleResolve(anomaly.id)}>
                      Mark Resolved
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
