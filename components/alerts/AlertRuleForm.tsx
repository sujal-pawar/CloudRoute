"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlertRule } from "@/lib/types";

type AlertRuleDraft = {
  name: string;
  scope: AlertRule["scope"];
  scopeValue: string;
  threshold: number;
  thresholdType: AlertRule["thresholdType"];
};

type AlertRuleFormProps = {
  editingRule?: AlertRule;
  isSubmitting?: boolean;
  onSubmit: (payload: AlertRuleDraft) => Promise<void> | void;
  onCancelEdit: () => void;
};

const scopeValueOptions: Record<Exclude<AlertRule["scope"], "total">, string[]> = {
  team: ["platform", "backend", "frontend", "data", "security", "devops"],
  service: ["ec2", "rds", "s3", "lambda", "elb", "eks"],
  environment: ["production", "staging", "development"],
};

export function AlertRuleForm({
  editingRule,
  isSubmitting = false,
  onSubmit,
  onCancelEdit,
}: AlertRuleFormProps) {
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState<AlertRule["scope"]>("team");
  const [scopeValue, setScopeValue] = React.useState("backend");
  const [threshold, setThreshold] = React.useState("8000");
  const [thresholdType, setThresholdType] = React.useState<AlertRule["thresholdType"]>("absolute");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!editingRule) {
      setName("");
      setScope("team");
      setScopeValue("backend");
      setThreshold("8000");
      setThresholdType("absolute");
      setError(null);
      return;
    }

    setName(editingRule.name);
    setScope(editingRule.scope);
    setScopeValue(editingRule.scopeValue || "total");
    setThreshold(String(editingRule.threshold));
    setThresholdType(editingRule.thresholdType);
    setError(null);
  }, [editingRule]);

  React.useEffect(() => {
    if (scope === "total") {
      setScopeValue("total");
      return;
    }

    const allowed = scopeValueOptions[scope];
    if (!allowed.includes(scopeValue)) {
      setScopeValue(allowed[0]);
    }
  }, [scope, scopeValue]);

  const valueChoices = scope === "total" ? ["total"] : scopeValueOptions[scope];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedThreshold = Number(threshold);
    if (!name.trim()) {
      setError("Alert name is required.");
      return;
    }

    if (!Number.isFinite(parsedThreshold) || parsedThreshold <= 0) {
      setError("Threshold must be a positive number.");
      return;
    }

    await onSubmit({
      name: name.trim(),
      scope,
      scopeValue: scope === "total" ? "total" : scopeValue,
      threshold: parsedThreshold,
      thresholdType,
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{editingRule ? "Edit Alert Rule" : "Create Alert Rule"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="alert-name">
              Alert Name
            </label>
            <Input
              id="alert-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Backend budget watch"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scope</label>
              <Select value={scope} onValueChange={(value) => setScope(value as AlertRule["scope"])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scope Value</label>
              <Select value={scopeValue} onValueChange={setScopeValue} disabled={scope === "total"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {valueChoices.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="alert-threshold">
                Threshold
              </label>
              <Input
                id="alert-threshold"
                type="number"
                min={1}
                step="0.01"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Threshold Type</label>
              <Select
                value={thresholdType}
                onValueChange={(value) => setThresholdType(value as AlertRule["thresholdType"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select threshold type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="absolute">Absolute USD</SelectItem>
                  <SelectItem value="percent-of-budget">Percent of Budget</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {editingRule ? "Save Changes" : "Create Rule"}
            </Button>
            {editingRule ? (
              <Button type="button" variant="ghost" onClick={onCancelEdit} disabled={isSubmitting}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export type { AlertRuleDraft };
