import type {
  AlertEvent,
  AlertRule,
  CostDataPoint,
  Environment,
  ResourceType,
  Team,
} from "@/lib/types";

type NewAlertRuleInput = {
  name: string;
  scope: AlertRule["scope"];
  scopeValue?: string;
  threshold: number;
  thresholdType?: AlertRule["thresholdType"];
};

type AlertCheckResult = {
  rules: AlertRule[];
  breachedEvents: AlertEvent[];
};

const TEAM_BUDGETS: Record<Team, number> = {
  platform: 5200,
  backend: 8000,
  frontend: 3800,
  data: 7600,
  security: 3000,
  devops: 5400,
};

const SERVICE_BUDGETS: Record<ResourceType, number> = {
  ec2: 12000,
  rds: 7000,
  s3: 2800,
  lambda: 2200,
  elb: 1700,
  eks: 8300,
};

const ENVIRONMENT_BUDGETS: Record<Environment, number> = {
  production: 19000,
  staging: 8000,
  development: 5000,
};

let alertRules: AlertRule[] = [
  {
    id: "rule-total-1",
    name: "Total Spend Guardrail",
    scope: "total",
    scopeValue: "total",
    threshold: 30000,
    thresholdType: "absolute",
    currentSpend: 0,
    breached: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule-backend-1",
    name: "Backend Budget Watch",
    scope: "team",
    scopeValue: "backend",
    threshold: 7600,
    thresholdType: "absolute",
    currentSpend: 0,
    breached: false,
    createdAt: new Date().toISOString(),
  },
];

let alertEvents: AlertEvent[] = [];

export function runAlertChecker(costData: CostDataPoint[]): AlertCheckResult {
  const breachedEvents: AlertEvent[] = [];

  alertRules = alertRules.map((rule) => {
    const currentSpend = round2(calculateCurrentSpend(rule, costData));
    const threshold = resolveThreshold(rule);
    const shouldBreach = currentSpend >= threshold;

    if (shouldBreach && !rule.breached) {
      const triggeredAt = new Date().toISOString();
      const event: AlertEvent = {
        id: `alert-event-${alertEvents.length + 1}`,
        ruleId: rule.id,
        ruleName: rule.name,
        triggeredAt,
        currentSpend,
        threshold,
        message: `${rule.name} breached: $${currentSpend} >= $${threshold}`,
      };

      alertEvents = [event, ...alertEvents].slice(0, 200);
      breachedEvents.push(event);

      return {
        ...rule,
        currentSpend,
        breached: true,
        lastTriggeredAt: triggeredAt,
      };
    }

    return {
      ...rule,
      currentSpend,
      breached: shouldBreach,
    };
  });

  return {
    rules: listAlertRules(costData),
    breachedEvents,
  };
}

export function listAlertRules(costData: CostDataPoint[]): AlertRule[] {
  return alertRules.map((rule) => {
    const currentSpend = round2(calculateCurrentSpend(rule, costData));
    const threshold = resolveThreshold(rule);

    return {
      ...rule,
      currentSpend,
      breached: currentSpend >= threshold,
    };
  });
}

export function listAlertEvents(): AlertEvent[] {
  return [...alertEvents];
}

export function createAlertRule(input: NewAlertRuleInput, costData: CostDataPoint[]): AlertRule {
  const scopeValue = input.scope === "total" ? "total" : (input.scopeValue ?? "").trim();

  if (!scopeValue) {
    throw new Error("scopeValue is required for team/service/environment alerts");
  }

  const newRule: AlertRule = {
    id: `rule-${alertRules.length + 1}-${Date.now()}`,
    name: input.name.trim(),
    scope: input.scope,
    scopeValue,
    threshold: round2(input.threshold),
    thresholdType: input.thresholdType ?? "absolute",
    currentSpend: 0,
    breached: false,
    createdAt: new Date().toISOString(),
  };

  alertRules = [newRule, ...alertRules];
  runAlertChecker(costData);

  const created = alertRules.find((rule) => rule.id === newRule.id);
  if (!created) {
    throw new Error("Failed to create alert rule");
  }

  return created;
}

function calculateCurrentSpend(rule: AlertRule, costData: CostDataPoint[]): number {
  const latestMonth = costData.slice(-30);

  if (rule.scope === "total") {
    return latestMonth.reduce((sum, point) => sum + point.totalCost, 0);
  }

  if (rule.scope === "team") {
    if (!isTeam(rule.scopeValue)) {
      return 0;
    }

    return latestMonth.reduce((sum, point) => sum + point.byTeam[rule.scopeValue], 0);
  }

  if (rule.scope === "service") {
    if (!isResourceType(rule.scopeValue)) {
      return 0;
    }

    return latestMonth.reduce((sum, point) => sum + point.byService[rule.scopeValue], 0);
  }

  if (!isEnvironment(rule.scopeValue)) {
    return 0;
  }

  return latestMonth.reduce((sum, point) => sum + point.byEnvironment[rule.scopeValue], 0);
}

function resolveThreshold(rule: AlertRule): number {
  if (rule.thresholdType === "absolute") {
    return rule.threshold;
  }

  const baseBudget = getScopeBudget(rule);
  return round2((baseBudget * rule.threshold) / 100);
}

function getScopeBudget(rule: AlertRule): number {
  if (rule.scope === "total") {
    return 32000;
  }

  if (rule.scope === "team" && isTeam(rule.scopeValue)) {
    return TEAM_BUDGETS[rule.scopeValue];
  }

  if (rule.scope === "service" && isResourceType(rule.scopeValue)) {
    return SERVICE_BUDGETS[rule.scopeValue];
  }

  if (rule.scope === "environment" && isEnvironment(rule.scopeValue)) {
    return ENVIRONMENT_BUDGETS[rule.scopeValue];
  }

  return 0;
}

function isTeam(value: string): value is Team {
  return value === "platform" || value === "backend" || value === "frontend" || value === "data" || value === "security" || value === "devops";
}

function isResourceType(value: string): value is ResourceType {
  return value === "ec2" || value === "rds" || value === "s3" || value === "lambda" || value === "elb" || value === "eks";
}

function isEnvironment(value: string): value is Environment {
  return value === "production" || value === "staging" || value === "development";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}