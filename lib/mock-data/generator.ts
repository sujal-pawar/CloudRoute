import type {
  CloudResource,
  CostDataPoint,
  DailyUsage,
  Environment,
  ResourceStatus,
  ResourceType,
  Team,
} from "@/lib/types";

type UsageProfile = "idle" | "business-hours" | "healthy";

type TierPrice = {
  tier: string;
  monthlyCost: number;
};

export type SeededAnomalyEvent = {
  id: string;
  date: string;
  resourceId: string;
  resourceName: string;
  team: Team;
  service: ResourceType;
  environment: Environment;
  multiplier: number;
  possibleCause: string;
};

const RNG_SEED = 20260417;
const TARGET_MONTHLY_SPEND = 32000;

const TEAM_COUNTS: Record<Team, number> = {
  platform: 8,
  backend: 10,
  frontend: 7,
  data: 9,
  security: 5,
  devops: 8,
};

const TYPE_COUNTS: Record<ResourceType, number> = {
  ec2: 15,
  rds: 8,
  s3: 10,
  lambda: 7,
  elb: 4,
  eks: 3,
};

const ENV_COUNTS: Record<Environment, number> = {
  production: 18,
  staging: 15,
  development: 14,
};

const REGION_COUNTS: Record<string, number> = {
  "us-east-1": 20,
  "us-west-2": 12,
  "eu-west-1": 10,
  "ap-southeast-1": 5,
};

const EC2_TIERS: TierPrice[] = [
  { tier: "t3.micro", monthlyCost: 8.5 },
  { tier: "t3.small", monthlyCost: 17 },
  { tier: "t3.medium", monthlyCost: 34 },
  { tier: "t3.large", monthlyCost: 68 },
  { tier: "t3.xlarge", monthlyCost: 135 },
  { tier: "m5.large", monthlyCost: 70 },
  { tier: "m5.xlarge", monthlyCost: 140 },
  { tier: "m5.2xlarge", monthlyCost: 280 },
  { tier: "c5.large", monthlyCost: 62 },
  { tier: "c5.xlarge", monthlyCost: 124 },
];

const RDS_TIERS: TierPrice[] = [
  { tier: "db.t3.micro", monthlyCost: 15 },
  { tier: "db.t3.small", monthlyCost: 30 },
  { tier: "db.t3.medium", monthlyCost: 60 },
  { tier: "db.r5.large", monthlyCost: 175 },
  { tier: "db.r5.xlarge", monthlyCost: 350 },
];

const RESOURCE_PREFIX: Record<ResourceType, string> = {
  ec2: "compute",
  rds: "db",
  s3: "bucket",
  lambda: "fn",
  elb: "lb",
  eks: "cluster",
};

const PROFILE_COUNTS: Record<UsageProfile, number> = {
  idle: 14,
  "business-hours": 9,
  healthy: 24,
};

const RESOURCE_TYPES: ResourceType[] = ["ec2", "rds", "s3", "lambda", "elb", "eks"];

const rng = createRng(RNG_SEED);

const TEAM_POOL = shuffle(expandCounts(TEAM_COUNTS), rng);
const TYPE_POOL = shuffle(expandCounts(TYPE_COUNTS), rng);
const ENV_POOL = shuffle(expandCounts(ENV_COUNTS), rng);
const REGION_POOL = shuffle(expandCounts(REGION_COUNTS), rng);
const PROFILE_POOL = shuffle(expandCounts(PROFILE_COUNTS), rng);

export const RESOURCES: CloudResource[] = generateResources();

const costArtifacts = generateCostSeries(RESOURCES);
export const COST_DATA: CostDataPoint[] = costArtifacts.costData;
export const SEEDED_ANOMALY_EVENTS: SeededAnomalyEvent[] = costArtifacts.seededAnomalies;

export const MOCK_DATA_SUMMARY = buildSummary(RESOURCES, COST_DATA);

export function getResources(): CloudResource[] {
  return RESOURCES;
}

export function getCostData(): CostDataPoint[] {
  return COST_DATA;
}

export function getSeededAnomalyEvents(): SeededAnomalyEvent[] {
  return SEEDED_ANOMALY_EVENTS;
}

function generateResources(): CloudResource[] {
  const resources: CloudResource[] = [];

  for (let index = 0; index < 47; index += 1) {
    const team = TEAM_POOL[index];
    const type = TYPE_POOL[index];
    const environment = ENV_POOL[index];
    const region = REGION_POOL[index];
    const profile = PROFILE_POOL[index];
    const pricing = getPricingForType(type, profile, rng);
    const createdDaysAgo = randomInt(25, 720, rng);
    const usageMetrics = generateUsageMetrics(profile, pricing.monthlyCost, rng);

    const resource: CloudResource = {
      id: `res-${String(index + 1).padStart(3, "0")}`,
      name: buildResourceName(type, team, environment, index + 1),
      type,
      environment,
      team,
      region,
      status: getStatusForProfile(profile, rng),
      monthlyCost: round2(pricing.monthlyCost),
      hourlyCost: round4(pricing.monthlyCost / (30 * 24)),
      tier: pricing.tier,
      createdAt: toIsoDate(daysAgo(createdDaysAgo)),
      tags: {
        owner: `${team}-team`,
        environment,
        costCenter: `CC-${team.toUpperCase().slice(0, 3)}`,
        application: `${team}-${RESOURCE_PREFIX[type]}`,
      },
      usageMetrics,
    };

    resources.push(resource);
  }

  return resources;
}

function generateCostSeries(resources: CloudResource[]): {
  costData: CostDataPoint[];
  seededAnomalies: SeededAnomalyEvent[];
} {
  const anomalyIndices = [17, 46, 76];
  const anomalyCandidates = resources
    .filter((resource) => resource.environment === "production")
    .sort((a, b) => b.monthlyCost - a.monthlyCost);

  const anomalyResources = [
    anomalyCandidates[0] ?? resources[0],
    anomalyCandidates[2] ?? resources[1],
    anomalyCandidates[5] ?? resources[2],
  ];

  const anomalyCauseByType: Record<ResourceType, string> = {
    ec2: "Unexpected autoscaling event on production API workload",
    rds: "High-volume analytical query burst on primary database",
    s3: "Large one-time backfill and replication transfer",
    lambda: "Retry storm from failed downstream dependency",
    elb: "Traffic surge from external integration test",
    eks: "Burst compute jobs scheduled across the cluster",
  };

  const dayAnomalyMap = new Map<number, { resourceId: string; multiplier: number }>();

  for (let i = 0; i < anomalyIndices.length; i += 1) {
    dayAnomalyMap.set(anomalyIndices[i], {
      resourceId: anomalyResources[i].id,
      multiplier: 3,
    });
  }

  const rawPoints: CostDataPoint[] = [];
  const seededAnomalies: SeededAnomalyEvent[] = [];

  for (let dayIndex = 0; dayIndex < 90; dayIndex += 1) {
    const currentDate = daysAgo(89 - dayIndex);
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

    const byService = emptyServiceRecord();
    const byTeam = emptyTeamRecord();
    const byEnvironment = emptyEnvironmentRecord();

    for (const resource of resources) {
      const variance = randomBetween(0.85, 1.15, rng);
      const baseDaily = resource.monthlyCost / 30;

      const weekendMultiplier = isWeekend
        ? resource.environment === "production"
          ? 0.8
          : resource.environment === "development"
            ? 0.4
            : 0.7
        : 1;

      let dailyCost = baseDaily * variance * weekendMultiplier;

      const anomalyRule = dayAnomalyMap.get(dayIndex);
      if (anomalyRule && anomalyRule.resourceId === resource.id) {
        dailyCost *= anomalyRule.multiplier;
        seededAnomalies.push({
          id: `anomaly-seeded-${seededAnomalies.length + 1}`,
          date: toIsoDate(currentDate),
          resourceId: resource.id,
          resourceName: resource.name,
          team: resource.team,
          service: resource.type,
          environment: resource.environment,
          multiplier: anomalyRule.multiplier,
          possibleCause: anomalyCauseByType[resource.type],
        });
      }

      byService[resource.type] += dailyCost;
      byTeam[resource.team] += dailyCost;
      byEnvironment[resource.environment] += dailyCost;
    }

    const totalCost = RESOURCE_TYPES.reduce((sum, type) => sum + byService[type], 0);

    rawPoints.push({
      date: toIsoDate(currentDate),
      totalCost: round2(totalCost),
      byService: roundRecord(byService),
      byTeam: roundRecord(byTeam),
      byEnvironment: roundRecord(byEnvironment),
    });
  }

  const trailingMonth = rawPoints.slice(-30).reduce((sum, point) => sum + point.totalCost, 0);
  const scale = trailingMonth > 0 ? TARGET_MONTHLY_SPEND / trailingMonth : 1;

  const costData = rawPoints.map((point) => ({
    date: point.date,
    totalCost: round2(point.totalCost * scale),
    byService: scaleRecord(point.byService, scale),
    byTeam: scaleRecord(point.byTeam, scale),
    byEnvironment: scaleRecord(point.byEnvironment, scale),
  }));

  return { costData, seededAnomalies };
}

function generateUsageMetrics(profile: UsageProfile, monthlyCost: number, random: () => number) {
  const today = new Date();

  if (profile === "idle") {
    const avgCpuPercent = randomBetween(0.5, 3, random);
    const avgMemoryPercent = randomBetween(2, 12, random);
    const avgNetworkMbps = randomBetween(0.01, 0.08, random);
    const avgDiskIops = randomBetween(1, 8, random);
    const peakHours = random() > 0.5 ? [] : uniqueHours(randomInt(1, 2, random), random);
    const lastActiveAt = toIsoDate(daysAgo(randomInt(8, 28, random)));
    const dailyUsage = createDailyUsage(profile, monthlyCost, random);

    return {
      avgCpuPercent: round2(avgCpuPercent),
      avgMemoryPercent: round2(avgMemoryPercent),
      avgNetworkMbps: round3(avgNetworkMbps),
      avgDiskIops: round2(avgDiskIops),
      peakHours,
      lastActiveAt,
      dailyUsage,
    };
  }

  if (profile === "business-hours") {
    const avgCpuPercent = randomBetween(12, 32, random);
    const avgMemoryPercent = randomBetween(18, 45, random);
    const avgNetworkMbps = randomBetween(0.2, 1.4, random);
    const avgDiskIops = randomBetween(18, 95, random);
    const lastActiveAt = toIsoDate(daysAgo(randomInt(0, 2, random)));
    const dailyUsage = createDailyUsage(profile, monthlyCost, random);

    return {
      avgCpuPercent: round2(avgCpuPercent),
      avgMemoryPercent: round2(avgMemoryPercent),
      avgNetworkMbps: round3(avgNetworkMbps),
      avgDiskIops: round2(avgDiskIops),
      peakHours: [9, 10, 11, 12, 13, 14, 17, 18, 20],
      lastActiveAt,
      dailyUsage,
    };
  }

  const avgCpuPercent = randomBetween(20, 75, random);
  const avgMemoryPercent = randomBetween(25, 78, random);
  const avgNetworkMbps = randomBetween(0.8, 6.5, random);
  const avgDiskIops = randomBetween(60, 340, random);
  const peakHours = uniqueHours(randomInt(4, 10, random), random).sort((a, b) => a - b);
  const lastActiveAt = toIsoDate(today);
  const dailyUsage = createDailyUsage(profile, monthlyCost, random);

  return {
    avgCpuPercent: round2(avgCpuPercent),
    avgMemoryPercent: round2(avgMemoryPercent),
    avgNetworkMbps: round3(avgNetworkMbps),
    avgDiskIops: round2(avgDiskIops),
    peakHours,
    lastActiveAt,
    dailyUsage,
  };
}

function createDailyUsage(profile: UsageProfile, monthlyCost: number, random: () => number): DailyUsage[] {
  const entries: DailyUsage[] = [];

  for (let daysBeforeToday = 29; daysBeforeToday >= 0; daysBeforeToday -= 1) {
    const date = daysAgo(daysBeforeToday);
    const weekend = date.getDay() === 0 || date.getDay() === 6;

    let cpuPercent = 0;
    let memoryPercent = 0;
    let networkMbps = 0;

    if (profile === "idle") {
      cpuPercent = randomBetween(0.2, 3.2, random);
      memoryPercent = randomBetween(1.5, 10, random);
      networkMbps = randomBetween(0.01, 0.08, random);
    } else if (profile === "business-hours") {
      const weekendReduction = weekend ? 0.35 : 1;
      cpuPercent = randomBetween(11, 30, random) * weekendReduction;
      memoryPercent = randomBetween(16, 42, random) * weekendReduction;
      networkMbps = randomBetween(0.15, 1.1, random) * weekendReduction;
    } else {
      cpuPercent = randomBetween(20, 78, random);
      memoryPercent = randomBetween(24, 82, random);
      networkMbps = randomBetween(0.8, 6.8, random);
    }

    const dailyCost = (monthlyCost / 30) * randomBetween(0.88, 1.12, random);

    entries.push({
      date: toIsoDate(date),
      cpuPercent: round2(cpuPercent),
      memoryPercent: round2(memoryPercent),
      networkMbps: round3(networkMbps),
      cost: round2(dailyCost),
    });
  }

  return entries;
}

function getPricingForType(type: ResourceType, profile: UsageProfile, random: () => number): TierPrice {
  if (type === "ec2") {
    const preferred = profile === "healthy" ? [7, 9, 6, 4] : profile === "idle" ? [3, 2, 5, 1] : [4, 5, 6, 8];
    const index = preferred[randomInt(0, preferred.length - 1, random)];
    return EC2_TIERS[index];
  }

  if (type === "rds") {
    const preferred = profile === "healthy" ? [4, 3] : profile === "idle" ? [2, 1, 0] : [3, 2];
    const index = preferred[randomInt(0, preferred.length - 1, random)];
    return RDS_TIERS[index];
  }

  if (type === "s3") {
    const monthlyCost = profile === "idle" ? randomBetween(6, 22, random) : randomBetween(25, 80, random);
    return { tier: profile === "idle" ? "archive-bucket" : "standard-bucket", monthlyCost };
  }

  if (type === "lambda") {
    const monthlyCost = profile === "idle" ? randomBetween(5, 18, random) : randomBetween(20, 95, random);
    return { tier: "serverless", monthlyCost };
  }

  if (type === "elb") {
    return { tier: "application-load-balancer", monthlyCost: randomBetween(16, 22, random) };
  }

  return { tier: "eks-cluster", monthlyCost: randomBetween(700, 1400, random) };
}

function getStatusForProfile(profile: UsageProfile, random: () => number): ResourceStatus {
  if (profile === "idle") {
    return random() > 0.2 ? "idle" : "stopped";
  }

  return "active";
}

function buildResourceName(type: ResourceType, team: Team, environment: Environment, sequence: number): string {
  const prefix = RESOURCE_PREFIX[type];
  const teamShort = team.slice(0, 3);
  const envShort = environment === "production" ? "prod" : environment === "staging" ? "stg" : "dev";
  return `${prefix}-${teamShort}-${envShort}-${String(sequence).padStart(2, "0")}`;
}

function buildSummary(resources: CloudResource[], costData: CostDataPoint[]) {
  const trailingMonthSpend = round2(costData.slice(-30).reduce((sum, point) => sum + point.totalCost, 0));

  return {
    resourceCount: resources.length,
    costPoints: costData.length,
    trailingMonthSpend,
    byTeam: countBy(resources, (resource) => resource.team),
    byType: countBy(resources, (resource) => resource.type),
    byEnvironment: countBy(resources, (resource) => resource.environment),
    byRegion: countBy(resources, (resource) => resource.region),
  };
}

function expandCounts<T extends string>(counts: Record<T, number>): T[] {
  const values: T[] = [];

  for (const [key, count] of Object.entries(counts) as [T, number][]) {
    for (let i = 0; i < count; i += 1) {
      values.push(key);
    }
  }

  return values;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function emptyServiceRecord(): Record<ResourceType, number> {
  return {
    ec2: 0,
    rds: 0,
    s3: 0,
    lambda: 0,
    elb: 0,
    eks: 0,
  };
}

function emptyTeamRecord(): Record<Team, number> {
  return {
    platform: 0,
    backend: 0,
    frontend: 0,
    data: 0,
    security: 0,
    devops: 0,
  };
}

function emptyEnvironmentRecord(): Record<Environment, number> {
  return {
    production: 0,
    staging: 0,
    development: 0,
  };
}

function scaleRecord<T extends string>(record: Record<T, number>, scale: number): Record<T, number> {
  const scaled = {} as Record<T, number>;

  for (const key of Object.keys(record) as T[]) {
    scaled[key] = round2(record[key] * scale);
  }

  return scaled;
}

function roundRecord<T extends string>(record: Record<T, number>): Record<T, number> {
  const rounded = {} as Record<T, number>;

  for (const key of Object.keys(record) as T[]) {
    rounded[key] = round2(record[key]);
  }

  return rounded;
}

function countBy<T extends string>(items: CloudResource[], selector: (item: CloudResource) => T): Record<T, number> {
  const counts = {} as Record<T, number>;

  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

function uniqueHours(count: number, random: () => number): number[] {
  const hourSet = new Set<number>();

  while (hourSet.size < count) {
    hourSet.add(randomInt(0, 23, random));
  }

  return [...hourSet].sort((a, b) => a - b);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;

  return function next() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomBetween(min: number, max: number, random: () => number): number {
  return min + random() * (max - min);
}

function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(randomBetween(min, max + 1, random));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}