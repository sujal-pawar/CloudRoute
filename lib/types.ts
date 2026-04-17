export type ResourceType = "ec2" | "rds" | "s3" | "lambda" | "elb" | "eks";
export type Environment = "production" | "staging" | "development";
export type Team =
  | "platform"
  | "backend"
  | "frontend"
  | "data"
  | "security"
  | "devops";
export type ResourceStatus = "active" | "idle" | "stopped" | "terminated";
export type DataSourceType = "demo" | "aws" | "azure" | "gcp";
export type CloudProvider = Exclude<DataSourceType, "demo">;

export interface CloudCredentials {
  provider: CloudProvider;
  label?: string;
  // AWS
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
  // Azure
  subscriptionId?: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  // GCP
  projectId?: string;
  serviceAccountKey?: string;
}

export interface UserSession {
  userId: string;
  email?: string;
  dataSource: DataSourceType;
  cloudCredentials?: CloudCredentials | null;
}

export interface CloudResource {
  id: string;
  name: string;
  type: ResourceType;
  environment: Environment;
  team: Team;
  region: string;
  status: ResourceStatus;
  monthlyCost: number;
  hourlyCost: number;
  tier: string;
  createdAt: string;
  tags: Record<string, string>;
  usageMetrics: UsageMetrics;
}

export interface UsageMetrics {
  avgCpuPercent: number;
  avgMemoryPercent: number;
  avgNetworkMbps: number;
  avgDiskIops: number;
  peakHours: number[];
  lastActiveAt: string;
  dailyUsage: DailyUsage[];
}

export interface DailyUsage {
  date: string;
  cpuPercent: number;
  memoryPercent: number;
  networkMbps: number;
  cost: number;
}

export interface CostDataPoint {
  date: string;
  totalCost: number;
  byService: Record<ResourceType, number>;
  byTeam: Record<Team, number>;
  byEnvironment: Record<Environment, number>;
}

export interface TeamCostSummary {
  team: Team;
  currentMonthCost: number;
  lastMonthCost: number;
  changePercent: number;
  resourceCount: number;
  idleCount: number;
  optimizationScore: number;
  budget?: number;
}

export interface IdleResource {
  resource: CloudResource;
  idleReason: string;
  idleDays: number;
  monthlySavings: number;
  recommendation: "terminate" | "resize" | "schedule-shutdown";
  confidence: number;
}

export interface Recommendation {
  id: string;
  resourceId: string;
  resourceName: string;
  type: "rightsize" | "terminate" | "schedule-shutdown" | "reserved-instance";
  currentTier: string;
  suggestedTier: string;
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  reasoning: string;
  effort: "low" | "medium" | "high";
  status: "pending" | "acted" | "dismissed";
  actedAt?: string;
  actualSavingsToDate?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  scope: "team" | "service" | "environment" | "total";
  scopeValue: string;
  threshold: number;
  thresholdType: "absolute" | "percent-of-budget";
  currentSpend: number;
  breached: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  currentSpend: number;
  threshold: number;
  message: string;
}

export interface CostAnomaly {
  id: string;
  detectedAt: string;
  resourceId: string;
  resourceName: string;
  team: Team;
  service: ResourceType;
  baselineCost: number;
  actualCost: number;
  spikePercent: number;
  estimatedExtra: number;
  possibleCause: string;
  resolved: boolean;
}

export interface SavingsEntry {
  recommendationId: string;
  resourceName: string;
  actedAt: string;
  projectedMonthlySavings: number;
  actualSavingsByDay: { date: string; saving: number }[];
  totalRealizedSavings: number;
}