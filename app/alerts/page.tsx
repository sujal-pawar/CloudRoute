"use client";

import * as React from "react";
import { toast } from "sonner";

import { AlertRuleForm, type AlertRuleDraft } from "@/components/alerts/AlertRuleForm";
import { AlertRuleList } from "@/components/alerts/AlertRuleList";
import { Skeleton } from "@/components/ui/skeleton";
import type { AlertEvent, AlertRule } from "@/lib/types";

type AlertsApiPayload = {
  rules?: AlertRule[];
  events?: AlertEvent[];
  error?: string;
};

export default function AlertsPage() {
  const [rules, setRules] = React.useState<AlertRule[]>([]);
  const [events, setEvents] = React.useState<AlertEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [busyRuleId, setBusyRuleId] = React.useState<string | null>(null);
  const [editingRule, setEditingRule] = React.useState<AlertRule | undefined>(undefined);

  const loadData = React.useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      const payload = (await response.json()) as AlertsApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load alerts");
      }

      setRules(payload.rules ?? []);
      setEvents(payload.events ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load alerts";
      toast.error("Unable to load alerts", { description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadData]);

  const handleFormSubmit = async (payload: AlertRuleDraft) => {
    setSubmitting(true);

    try {
      if (editingRule) {
        const response = await fetch(`/api/alerts/${editingRule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = (await response.json()) as AlertsApiPayload;
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to update alert rule");
        }

        toast.success("Alert rule updated");
      } else {
        const response = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = (await response.json()) as AlertsApiPayload;
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to create alert rule");
        }

        toast.success("Alert rule created");
      }

      setEditingRule(undefined);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save alert rule";
      toast.error("Save failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setBusyRuleId(ruleId);

    try {
      const response = await fetch(`/api/alerts/${ruleId}`, { method: "DELETE" });
      const payload = (await response.json()) as AlertsApiPayload;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to delete alert rule");
      }

      if (editingRule?.id === ruleId) {
        setEditingRule(undefined);
      }

      toast.success("Alert rule deleted");
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete alert rule";
      toast.error("Delete failed", { description: message });
    } finally {
      setBusyRuleId(null);
    }
  };

  return (
    <section className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Budget Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure cost thresholds and review breach history across teams, services, and environments.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <AlertRuleList
            rules={rules}
            events={events}
            busyRuleId={busyRuleId}
            onEdit={setEditingRule}
            onDelete={handleDeleteRule}
          />
          <AlertRuleForm
            editingRule={editingRule}
            isSubmitting={submitting}
            onSubmit={handleFormSubmit}
            onCancelEdit={() => setEditingRule(undefined)}
          />
        </div>
      )}
    </section>
  );
}
