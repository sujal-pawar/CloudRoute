"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AlertEvent, AlertRule } from "@/lib/types";

type AlertRuleListProps = {
  rules: AlertRule[];
  events: AlertEvent[];
  busyRuleId?: string | null;
  onEdit: (rule: AlertRule) => void;
  onDelete: (ruleId: string) => void;
};

export function AlertRuleList({
  rules,
  events,
  busyRuleId,
  onEdit,
  onDelete,
}: AlertRuleListProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alert rules yet. Create one to start monitoring budget thresholds.</p>
          ) : (
            rules.map((rule) => {
              const rawRatio = rule.threshold > 0 ? (rule.currentSpend / rule.threshold) * 100 : 0;
              const ratio = Number.isFinite(rawRatio) ? Math.min(rawRatio, 100) : 0;
              const ratioLabel = `${Math.round(rawRatio)}%`;

              return (
                <div key={rule.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.scope}:{" "}
                        <span className="font-mono">{rule.scopeValue}</span> · {rule.thresholdType === "absolute" ? "Absolute" : "Percent"}
                      </p>
                    </div>
                    <Badge variant={rule.breached ? "destructive" : "secondary"}>
                      {rule.breached ? "Breached" : "Healthy"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">
                        {formatCurrency(rule.currentSpend)} / {rule.thresholdType === "absolute" ? formatCurrency(rule.threshold) : `${rule.threshold}%`}
                      </span>
                      <span className={rule.breached ? "text-destructive" : rawRatio > 80 ? "text-amber-500" : "text-emerald-600"}>
                        {ratioLabel}
                      </span>
                    </div>
                    <Progress value={ratio} className={rule.breached ? "**:data-[slot=progress-indicator]:bg-destructive" : rawRatio > 80 ? "**:data-[slot=progress-indicator]:bg-amber-500" : "**:data-[slot=progress-indicator]:bg-emerald-500"} />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(rule)} disabled={busyRuleId === rule.id}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(rule.id)} disabled={busyRuleId === rule.id}>
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No breaches yet. Triggered alerts will appear here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.slice(0, 12).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(event.triggeredAt)}</TableCell>
                    <TableCell className="font-medium">{event.ruleName}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(event.currentSpend)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(event.threshold)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Breached</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
