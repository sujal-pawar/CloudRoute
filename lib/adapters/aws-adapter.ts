import "server-only"

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  type Datapoint,
  type Dimension,
} from "@aws-sdk/client-cloudwatch"
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
} from "@aws-sdk/client-cost-explorer"
import {
  DescribeInstancesCommand,
  EC2Client,
  type Instance,
  type Tag as Ec2Tag,
} from "@aws-sdk/client-ec2"
import {
  DescribeDBInstancesCommand,
  RDSClient,
  type DBInstance,
  type Tag as RdsTag,
} from "@aws-sdk/client-rds"
import {
  GetBucketLocationCommand,
  ListBucketsCommand,
  S3Client,
  type Bucket,
} from "@aws-sdk/client-s3"

import type { SeededAnomalyEvent } from "@/lib/mock-data/generator"
import type {
  CloudCredentials,
  CloudResource,
  CostDataPoint,
  Environment,
  ResourceStatus,
  ResourceType,
  Team,
} from "@/lib/types"

type AwsSnapshot = {
  resources: CloudResource[]
  costData90d: CostDataPoint[]
  seededAnomalyEvents: SeededAnomalyEvent[]
  generatedAt: number
}

type ServiceCosts = Record<ResourceType, number>
type TeamCosts = Record<Team, number>
type EnvironmentCosts = Record<Environment, number>

type AwsResourceCandidate = {
  id: string
  name: string
  type: ResourceType
  tier: string
  team: Team
  environment: Environment
  region: string
  status: ResourceStatus
  tags: Record<string, string>
  createdAt: string
  monthlyCostEstimate: number
  usageMetrics: CloudResource["usageMetrics"]
}

type AwsClientSet = {
  ec2: EC2Client
  rds: RDSClient
  s3: S3Client
  cloudWatch: CloudWatchClient
  costExplorer: CostExplorerClient
}

const AWS_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_RESOURCES = 160

const TEAM_VALUES: Team[] = ["platform", "backend", "frontend", "data", "security", "devops"]
const RESOURCE_TYPE_VALUES: ResourceType[] = ["ec2", "rds", "s3", "lambda", "elb", "eks"]
const ENVIRONMENT_VALUES: Environment[] = ["production", "staging", "development"]

const AWS_SERVICE_TO_TYPE: Array<{ contains: string; type: ResourceType }> = [
  { contains: "EC2", type: "ec2" },
  { contains: "ELASTIC COMPUTE CLOUD", type: "ec2" },
  { contains: "RDS", type: "rds" },
  { contains: "S3", type: "s3" },
  { contains: "LAMBDA", type: "lambda" },
  { contains: "ELB", type: "elb" },
  { contains: "LOAD BALANCING", type: "elb" },
  { contains: "EKS", type: "eks" },
  { contains: "KUBERNETES", type: "eks" },
]

const TEAM_MATCHERS: Record<Team, string[]> = {
  platform: ["platform", "plat"],
  backend: ["backend", "be"],
  frontend: ["frontend", "fe", "front-end"],
  data: ["data", "analytics"],
  security: ["security", "sec"],
  devops: ["devops", "ops"],
}

const ENVIRONMENT_MATCHERS: Record<Environment, string[]> = {
  production: ["production", "prod"],
  staging: ["staging", "stage", "stg"],
  development: ["development", "dev", "sandbox"],
}

const INSTANCE_MONTHLY_COST_ESTIMATE: Record<string, number> = {
  "t3.nano": 4,
  "t3.micro": 8.5,
  "t3.small": 17,
  "t3.medium": 34,
  "t3.large": 68,
  "t3.xlarge": 135,
  "m5.large": 70,
  "m5.xlarge": 140,
  "m5.2xlarge": 280,
  "c5.large": 62,
  "c5.xlarge": 124,
}

const RDS_MONTHLY_COST_ESTIMATE: Record<string, number> = {
  "db.t3.micro": 15,
  "db.t3.small": 30,
  "db.t3.medium": 60,
  "db.r5.large": 175,
  "db.r5.xlarge": 350,
}

const snapshotCache = new Map<string, AwsSnapshot>()

export async function fetchAWSResources(credentials: CloudCredentials): Promise<CloudResource[]> {
  const snapshot = await getSnapshot(credentials)
  return structuredClone(snapshot.resources)
}

export async function fetchAWSCostData(
  credentials: CloudCredentials,
  days = 90
): Promise<CostDataPoint[]> {
  const snapshot = await getSnapshot(credentials)
  return structuredClone(snapshot.costData90d.slice(-days))
}

export async function fetchAWSSeededAnomalyEvents(
  credentials: CloudCredentials
): Promise<SeededAnomalyEvent[]> {
  const snapshot = await getSnapshot(credentials)
  return structuredClone(snapshot.seededAnomalyEvents)
}

async function getSnapshot(credentials: CloudCredentials): Promise<AwsSnapshot> {
  const cacheKey = buildCacheKey(credentials)
  const cached = snapshotCache.get(cacheKey)

  if (cached && Date.now() - cached.generatedAt < AWS_CACHE_TTL_MS) {
    return cached
  }

  const snapshot = await loadSnapshot(credentials)
  snapshotCache.set(cacheKey, snapshot)
  return snapshot
}

async function loadSnapshot(credentials: CloudCredentials): Promise<AwsSnapshot> {
  const clients = createAwsClients(credentials)
  const region = credentials.region ?? "us-east-1"

  const [ec2Candidates, rdsCandidates, s3Candidates, dailyCostsByDate] = await Promise.all([
    listEc2Resources(clients, region),
    listRdsResources(clients, region),
    listS3Resources(clients),
    fetchDailyCostsByService(clients.costExplorer, 90),
  ])

  const allCandidates = [...ec2Candidates, ...rdsCandidates, ...s3Candidates].slice(0, MAX_RESOURCES)
  const monthlyServiceTotals = buildMonthlyServiceTotals(dailyCostsByDate)
  const resources = applyServiceCostNormalization(allCandidates, monthlyServiceTotals)
  const costData90d = buildCostDataPoints(dailyCostsByDate, resources)
  const seededAnomalyEvents = buildAwsAnomalySeeds(resources, costData90d)

  return {
    resources,
    costData90d,
    seededAnomalyEvents,
    generatedAt: Date.now(),
  }
}

function createAwsClients(credentials: CloudCredentials): AwsClientSet {
  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    throw new Error("AWS credentials are incomplete. accessKeyId and secretAccessKey are required.")
  }

  const defaultRegion = credentials.region ?? "us-east-1"
  const awsCredentials = {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  }

  return {
    ec2: new EC2Client({ region: defaultRegion, credentials: awsCredentials }),
    rds: new RDSClient({ region: defaultRegion, credentials: awsCredentials }),
    s3: new S3Client({ region: defaultRegion, credentials: awsCredentials }),
    cloudWatch: new CloudWatchClient({ region: defaultRegion, credentials: awsCredentials }),
    costExplorer: new CostExplorerClient({ region: "us-east-1", credentials: awsCredentials }),
  }
}

async function listEc2Resources(clients: AwsClientSet, region: string): Promise<AwsResourceCandidate[]> {
  const instances: Instance[] = []
  let nextToken: string | undefined

  do {
    const response = await clients.ec2.send(
      new DescribeInstancesCommand({ NextToken: nextToken, MaxResults: 1000 })
    )

    for (const reservation of response.Reservations ?? []) {
      for (const instance of reservation.Instances ?? []) {
        instances.push(instance)
      }
    }

    nextToken = response.NextToken
  } while (nextToken)

  const candidates = await mapWithConcurrency(instances, 6, async (instance) => {
    const tags = toTagMap(instance.Tags)
    const name = tags.Name ?? instance.InstanceId ?? "ec2-instance"
    const team = inferTeam(tags, name)
    const environment = inferEnvironment(tags, name)
    const tier = instance.InstanceType ?? "t3.medium"
    const monthlyCostEstimate = INSTANCE_MONTHLY_COST_ESTIMATE[tier] ?? 54
    const instanceId = instance.InstanceId ?? `ec2-${Math.random().toString(16).slice(2, 10)}`

    const usageMetrics = await buildEc2UsageMetrics(clients.cloudWatch, instanceId, monthlyCostEstimate)

    return {
      id: `ec2-${instanceId}`,
      name,
      type: "ec2" as const,
      tier,
      team,
      environment,
      region: regionFromAvailabilityZone(instance.Placement?.AvailabilityZone, region),
      status: mapEc2State(instance.State?.Name),
      tags,
      createdAt: instance.LaunchTime?.toISOString() ?? new Date().toISOString(),
      monthlyCostEstimate,
      usageMetrics,
    }
  })

  return candidates
}

async function listRdsResources(clients: AwsClientSet, region: string): Promise<AwsResourceCandidate[]> {
  const instances: DBInstance[] = []
  let marker: string | undefined

  do {
    const response = await clients.rds.send(
      new DescribeDBInstancesCommand({ Marker: marker, MaxRecords: 100 })
    )

    for (const instance of response.DBInstances ?? []) {
      instances.push(instance)
    }

    marker = response.Marker
  } while (marker)

  const candidates = await mapWithConcurrency(instances, 6, async (dbInstance) => {
    const tags = toTagMap(dbInstance.TagList)
    const name = tags.Name ?? dbInstance.DBInstanceIdentifier ?? "rds-instance"
    const team = inferTeam(tags, name)
    const environment = inferEnvironment(tags, name)
    const tier = dbInstance.DBInstanceClass ?? "db.t3.medium"
    const monthlyCostEstimate = RDS_MONTHLY_COST_ESTIMATE[tier] ?? 120
    const identifier = dbInstance.DBInstanceIdentifier ?? `rds-${Math.random().toString(16).slice(2, 10)}`

    const usageMetrics = await buildRdsUsageMetrics(clients.cloudWatch, identifier, monthlyCostEstimate)

    return {
      id: `rds-${identifier}`,
      name,
      type: "rds" as const,
      tier,
      team,
      environment,
      region: dbInstance.AvailabilityZone
        ? regionFromAvailabilityZone(dbInstance.AvailabilityZone, region)
        : region,
      status: mapRdsStatus(dbInstance.DBInstanceStatus),
      tags,
      createdAt: dbInstance.InstanceCreateTime?.toISOString() ?? new Date().toISOString(),
      monthlyCostEstimate,
      usageMetrics,
    }
  })

  return candidates
}

async function listS3Resources(clients: AwsClientSet): Promise<AwsResourceCandidate[]> {
  const response = await clients.s3.send(new ListBucketsCommand({}))

  const candidates = await mapWithConcurrency(response.Buckets ?? [], 5, async (bucket) => {
    return buildS3Candidate(clients, bucket)
  })

  return candidates
}

async function buildS3Candidate(
  clients: AwsClientSet,
  bucket: Bucket
): Promise<AwsResourceCandidate> {
  const name = bucket.Name ?? `bucket-${Math.random().toString(16).slice(2, 8)}`
  const location = await clients.s3.send(new GetBucketLocationCommand({ Bucket: name }))
  const region = normalizeS3Region(location.LocationConstraint)

  const [sizeSeries, objectSeries] = await Promise.all([
    fetchMetricSeries(clients.cloudWatch, {
      namespace: "AWS/S3",
      metricName: "BucketSizeBytes",
      dimensions: [
        { Name: "BucketName", Value: name },
        { Name: "StorageType", Value: "StandardStorage" },
      ],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
    fetchMetricSeries(clients.cloudWatch, {
      namespace: "AWS/S3",
      metricName: "NumberOfObjects",
      dimensions: [
        { Name: "BucketName", Value: name },
        { Name: "StorageType", Value: "AllStorageTypes" },
      ],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
  ])

  const averageBytes = average(sizeSeries.map((point) => point.value))
  const averageGiB = averageBytes > 0 ? averageBytes / (1024 ** 3) : 40
  const monthlyCostEstimate = Math.max(5, round2(averageGiB * 0.023))

  const usageMetrics = buildUsageFromSeries({
    cpuSeries: sizeSeries.map((point) => ({ date: point.date, value: Math.min(3, averageGiB / 50) })),
    networkSeries: objectSeries.map((point) => ({ date: point.date, value: point.value / 100000 })),
    monthlyCostEstimate,
    defaultDiskIops: Math.max(2, average(objectSeries.map((point) => point.value / 1000))),
  })

  const tags = {
    provider: "aws",
    service: "s3",
  }

  return {
    id: `s3-${name}`,
    name,
    type: "s3",
    tier: "standard-bucket",
    team: inferTeam(tags, name),
    environment: inferEnvironment(tags, name),
    region,
    status: "active",
    tags,
    createdAt: bucket.CreationDate?.toISOString() ?? new Date().toISOString(),
    monthlyCostEstimate,
    usageMetrics,
  }
}

async function buildEc2UsageMetrics(
  cloudWatch: CloudWatchClient,
  instanceId: string,
  monthlyCostEstimate: number
) {
  const [cpuSeries, networkInSeries, networkOutSeries] = await Promise.all([
    fetchMetricSeries(cloudWatch, {
      namespace: "AWS/EC2",
      metricName: "CPUUtilization",
      dimensions: [{ Name: "InstanceId", Value: instanceId }],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
    fetchMetricSeries(cloudWatch, {
      namespace: "AWS/EC2",
      metricName: "NetworkIn",
      dimensions: [{ Name: "InstanceId", Value: instanceId }],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
    fetchMetricSeries(cloudWatch, {
      namespace: "AWS/EC2",
      metricName: "NetworkOut",
      dimensions: [{ Name: "InstanceId", Value: instanceId }],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
  ])

  const combinedNetworkSeries = cpuSeries.map((point, index) => {
    const networkIn = networkInSeries[index]?.value ?? 0
    const networkOut = networkOutSeries[index]?.value ?? 0
    const mbps = ((networkIn + networkOut) / (1024 * 1024)) / (24 * 60 * 60)

    return {
      date: point.date,
      value: mbps,
    }
  })

  return buildUsageFromSeries({
    cpuSeries,
    networkSeries: combinedNetworkSeries,
    monthlyCostEstimate,
  })
}

async function buildRdsUsageMetrics(
  cloudWatch: CloudWatchClient,
  dbIdentifier: string,
  monthlyCostEstimate: number
) {
  const [cpuSeries, networkReceiveSeries, networkTransmitSeries] = await Promise.all([
    fetchMetricSeries(cloudWatch, {
      namespace: "AWS/RDS",
      metricName: "CPUUtilization",
      dimensions: [{ Name: "DBInstanceIdentifier", Value: dbIdentifier }],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
    fetchMetricSeries(cloudWatch, {
      namespace: "AWS/RDS",
      metricName: "NetworkReceiveThroughput",
      dimensions: [{ Name: "DBInstanceIdentifier", Value: dbIdentifier }],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
    fetchMetricSeries(cloudWatch, {
      namespace: "AWS/RDS",
      metricName: "NetworkTransmitThroughput",
      dimensions: [{ Name: "DBInstanceIdentifier", Value: dbIdentifier }],
      periodSeconds: 24 * 60 * 60,
      statistic: "Average",
    }),
  ])

  const combinedNetworkSeries = cpuSeries.map((point, index) => {
    const receive = networkReceiveSeries[index]?.value ?? 0
    const transmit = networkTransmitSeries[index]?.value ?? 0
    const mbps = (receive + transmit) / (1024 * 1024)

    return {
      date: point.date,
      value: mbps,
    }
  })

  return buildUsageFromSeries({
    cpuSeries,
    networkSeries: combinedNetworkSeries,
    monthlyCostEstimate,
    memoryMultiplier: 1.3,
  })
}

async function fetchDailyCostsByService(
  costExplorer: CostExplorerClient,
  days: number
): Promise<Array<{ date: string; byService: ServiceCosts }>> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setUTCDate(endDate.getUTCDate() - days)

  const result = await costExplorer.send(
    new GetCostAndUsageCommand({
      TimePeriod: {
        Start: toIsoDate(startDate),
        End: toIsoDate(endDate),
      },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
      GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
    })
  )

  const points: Array<{ date: string; byService: ServiceCosts }> = []

  for (const bucket of result.ResultsByTime ?? []) {
    const byService = emptyServiceRecord()

    for (const group of bucket.Groups ?? []) {
      const serviceName = group.Keys?.[0]
      const type = mapServiceToType(serviceName)

      if (!type) {
        continue
      }

      const amount = Number(group.Metrics?.UnblendedCost?.Amount ?? 0)
      byService[type] += Number.isFinite(amount) ? amount : 0
    }

    points.push({
      date: bucket.TimePeriod?.Start ?? new Date().toISOString().slice(0, 10),
      byService: roundServiceRecord(byService),
    })
  }

  if (points.length === 0) {
    throw new Error("AWS Cost Explorer returned no cost data. Check CE permissions and billing access.")
  }

  return points
}

function applyServiceCostNormalization(
  candidates: AwsResourceCandidate[],
  monthlyServiceTotals: ServiceCosts
): CloudResource[] {
  const byType = new Map<ResourceType, AwsResourceCandidate[]>()

  for (const type of RESOURCE_TYPE_VALUES) {
    byType.set(type, [])
  }

  for (const candidate of candidates) {
    byType.get(candidate.type)?.push(candidate)
  }

  const resources: CloudResource[] = []

  for (const type of RESOURCE_TYPE_VALUES) {
    const group = byType.get(type) ?? []
    if (group.length === 0) {
      continue
    }

    const serviceTotal = monthlyServiceTotals[type]
    const estimatedTotal = sum(group.map((entry) => entry.monthlyCostEstimate))
    const scale = estimatedTotal > 0 && serviceTotal > 0 ? serviceTotal / estimatedTotal : 1

    for (const candidate of group) {
      const monthlyCost = round2(Math.max(0.01, candidate.monthlyCostEstimate * scale))
      resources.push({
        id: candidate.id,
        name: candidate.name,
        type: candidate.type,
        environment: candidate.environment,
        team: candidate.team,
        region: candidate.region,
        status: candidate.status,
        monthlyCost,
        hourlyCost: round4(monthlyCost / (30 * 24)),
        tier: candidate.tier,
        createdAt: candidate.createdAt,
        tags: candidate.tags,
        usageMetrics: normalizeUsage(candidate.usageMetrics, monthlyCost),
      })
    }
  }

  return resources
}

function buildCostDataPoints(
  dailyCostsByDate: Array<{ date: string; byService: ServiceCosts }>,
  resources: CloudResource[]
): CostDataPoint[] {
  const teamShares = buildTeamShare(resources)
  const environmentShares = buildEnvironmentShare(resources)

  return dailyCostsByDate.map((entry) => {
    const byService = roundServiceRecord(entry.byService)
    const totalCost = round2(sum(Object.values(byService)))
    const byTeam = emptyTeamRecord()
    const byEnvironment = emptyEnvironmentRecord()

    for (const team of TEAM_VALUES) {
      byTeam[team] = round2(totalCost * teamShares[team])
    }

    for (const environment of ENVIRONMENT_VALUES) {
      byEnvironment[environment] = round2(totalCost * environmentShares[environment])
    }

    return {
      date: entry.date,
      totalCost,
      byService,
      byTeam,
      byEnvironment,
    }
  })
}

function buildAwsAnomalySeeds(
  resources: CloudResource[],
  costData: CostDataPoint[]
): SeededAnomalyEvent[] {
  if (resources.length === 0 || costData.length < 10) {
    return []
  }

  const expensiveResources = [...resources]
    .sort((left, right) => right.monthlyCost - left.monthlyCost)
    .slice(0, 10)

  const candidates: Array<{ date: string; multiplier: number }> = []

  for (let index = 7; index < costData.length; index += 1) {
    const current = costData[index]
    const baseline = average(costData.slice(index - 7, index).map((point) => point.totalCost))
    if (baseline <= 0) {
      continue
    }

    const ratio = current.totalCost / baseline
    if (ratio >= 1.35) {
      candidates.push({ date: current.date, multiplier: round2(Math.min(3, ratio)) })
    }
  }

  return candidates.slice(0, 3).map((candidate, index) => {
    const resource = expensiveResources[index % expensiveResources.length]
    return {
      id: `aws-seeded-anomaly-${index + 1}`,
      date: candidate.date,
      resourceId: resource.id,
      resourceName: resource.name,
      team: resource.team,
      service: resource.type,
      environment: resource.environment,
      multiplier: candidate.multiplier,
      possibleCause: `Detected AWS spend spike for ${resource.type.toUpperCase()} resource ${resource.name}`,
    }
  })
}

async function fetchMetricSeries(
  cloudWatch: CloudWatchClient,
  input: {
    namespace: string
    metricName: string
    dimensions: Dimension[]
    periodSeconds: number
    statistic: "Average" | "Sum"
  }
): Promise<Array<{ date: string; value: number }>> {
  const endTime = new Date()
  const startTime = new Date()
  startTime.setUTCDate(endTime.getUTCDate() - 30)

  const response = await cloudWatch.send(
    new GetMetricStatisticsCommand({
      Namespace: input.namespace,
      MetricName: input.metricName,
      Dimensions: input.dimensions,
      StartTime: startTime,
      EndTime: endTime,
      Period: input.periodSeconds,
      Statistics: [input.statistic],
      Unit: undefined,
    })
  )

  const points = (response.Datapoints ?? [])
    .filter((point): point is Datapoint & { Timestamp: Date } => Boolean(point.Timestamp))
    .map((point) => ({
      date: toIsoDate(point.Timestamp),
      value:
        Number(
          input.statistic === "Average"
            ? point.Average ?? 0
            : point.Sum ?? 0
        ) || 0,
    }))
    .sort((left, right) => left.date.localeCompare(right.date))

  if (points.length === 0) {
    return buildFlatSeries(30, 0)
  }

  return fillMissingDates(points, 30)
}

function buildUsageFromSeries(input: {
  cpuSeries: Array<{ date: string; value: number }>
  networkSeries: Array<{ date: string; value: number }>
  monthlyCostEstimate: number
  memoryMultiplier?: number
  defaultDiskIops?: number
}): CloudResource["usageMetrics"] {
  const cpuSeries = fillMissingDates(input.cpuSeries, 30)
  const networkSeries = fillMissingDates(input.networkSeries, 30)

  const cpuValues = cpuSeries.map((point) => clamp(point.value, 0, 100))
  const networkValues = networkSeries.map((point) => Math.max(0, point.value))
  const avgCpuPercent = round2(average(cpuValues))
  const avgNetworkMbps = round3(average(networkValues))
  const memoryMultiplier = input.memoryMultiplier ?? 1.1
  const avgMemoryPercent = round2(clamp(avgCpuPercent * memoryMultiplier, 1, 95))
  const avgDiskIops = round2(
    input.defaultDiskIops ?? Math.max(1, avgNetworkMbps * 30)
  )

  const dailyUsage = cpuSeries.map((cpuPoint, index) => {
    const network = networkValues[index] ?? avgNetworkMbps
    const memory = clamp(cpuPoint.value * memoryMultiplier, 1, 95)
    const dailyCost = round2((input.monthlyCostEstimate / 30) * (0.92 + ((index % 7) * 0.02)))

    return {
      date: cpuPoint.date,
      cpuPercent: round2(cpuPoint.value),
      memoryPercent: round2(memory),
      networkMbps: round3(network),
      cost: dailyCost,
    }
  })

  const peakHours = avgCpuPercent > 45 ? [10, 11, 12, 13, 14, 15, 16, 17] : [10, 11, 12]
  const idleDays = cpuValues.reduce((count, value) => (value < 5 ? count + 1 : count), 0)
  const lastActiveAt =
    idleDays > 14
      ? toIsoDate(daysAgo(16))
      : toIsoDate(daysAgo(1))

  return {
    avgCpuPercent,
    avgMemoryPercent,
    avgNetworkMbps,
    avgDiskIops,
    peakHours,
    lastActiveAt,
    dailyUsage,
  }
}

function normalizeUsage(usage: CloudResource["usageMetrics"], monthlyCost: number) {
  const dailyUsage = usage.dailyUsage.map((point, index) => ({
    ...point,
    cost: round2((monthlyCost / 30) * (0.92 + ((index % 5) * 0.03))),
  }))

  return {
    ...usage,
    dailyUsage,
  }
}

function buildMonthlyServiceTotals(
  points: Array<{ date: string; byService: ServiceCosts }>
): ServiceCosts {
  const trailingWindow = points.slice(-30)
  const totals = emptyServiceRecord()

  for (const point of trailingWindow) {
    for (const type of RESOURCE_TYPE_VALUES) {
      totals[type] += point.byService[type]
    }
  }

  return roundServiceRecord(totals)
}

function buildTeamShare(resources: CloudResource[]): Record<Team, number> {
  const totals = emptyTeamRecord()
  const sumCost = sum(resources.map((resource) => resource.monthlyCost))

  if (sumCost <= 0) {
    return equalTeamShare()
  }

  for (const resource of resources) {
    totals[resource.team] += resource.monthlyCost
  }

  const shares = {} as Record<Team, number>

  for (const team of TEAM_VALUES) {
    shares[team] = totals[team] / sumCost
  }

  return shares
}

function buildEnvironmentShare(resources: CloudResource[]): Record<Environment, number> {
  const totals = emptyEnvironmentRecord()
  const sumCost = sum(resources.map((resource) => resource.monthlyCost))

  if (sumCost <= 0) {
    return {
      production: 0.7,
      staging: 0.2,
      development: 0.1,
    }
  }

  for (const resource of resources) {
    totals[resource.environment] += resource.monthlyCost
  }

  const shares = {} as Record<Environment, number>

  for (const environment of ENVIRONMENT_VALUES) {
    shares[environment] = totals[environment] / sumCost
  }

  return shares
}

function equalTeamShare(): Record<Team, number> {
  const share = 1 / TEAM_VALUES.length
  return {
    platform: share,
    backend: share,
    frontend: share,
    data: share,
    security: share,
    devops: share,
  }
}

function inferTeam(tags: Record<string, string>, fallbackText: string): Team {
  const source = `${tags.team ?? ""} ${tags.Team ?? ""} ${tags.owner ?? ""} ${fallbackText}`.toLowerCase()

  for (const team of TEAM_VALUES) {
    if (TEAM_MATCHERS[team].some((matcher) => source.includes(matcher))) {
      return team
    }
  }

  return "platform"
}

function inferEnvironment(tags: Record<string, string>, fallbackText: string): Environment {
  const source = `${tags.environment ?? ""} ${tags.env ?? ""} ${fallbackText}`.toLowerCase()

  for (const environment of ENVIRONMENT_VALUES) {
    if (ENVIRONMENT_MATCHERS[environment].some((matcher) => source.includes(matcher))) {
      return environment
    }
  }

  return "production"
}

function mapServiceToType(serviceName: string | undefined): ResourceType | null {
  if (!serviceName) {
    return null
  }

  const normalized = serviceName.toUpperCase()

  for (const mapping of AWS_SERVICE_TO_TYPE) {
    if (normalized.includes(mapping.contains)) {
      return mapping.type
    }
  }

  return null
}

function mapEc2State(value: string | undefined): ResourceStatus {
  if (value === "stopped") {
    return "stopped"
  }

  if (value === "terminated" || value === "shutting-down") {
    return "terminated"
  }

  return "active"
}

function mapRdsStatus(value: string | undefined): ResourceStatus {
  if (value === "stopped") {
    return "stopped"
  }

  if (value === "deleting") {
    return "terminated"
  }

  return "active"
}

function regionFromAvailabilityZone(availabilityZone: string | undefined, fallbackRegion: string): string {
  if (!availabilityZone) {
    return fallbackRegion
  }

  if (availabilityZone.length > 1) {
    return availabilityZone.slice(0, -1)
  }

  return fallbackRegion
}

function normalizeS3Region(locationConstraint: string | undefined): string {
  if (!locationConstraint || locationConstraint === "") {
    return "us-east-1"
  }

  if (locationConstraint === "EU") {
    return "eu-west-1"
  }

  return locationConstraint
}

function toTagMap(tags: Array<Ec2Tag | RdsTag> | undefined): Record<string, string> {
  const map: Record<string, string> = {}

  for (const tag of tags ?? []) {
    if (!tag.Key || !tag.Value) {
      continue
    }

    map[tag.Key] = tag.Value
  }

  return map
}

function buildCacheKey(credentials: CloudCredentials): string {
  return [
    credentials.provider,
    credentials.accessKeyId ?? "",
    credentials.region ?? "us-east-1",
  ].join(":")
}

function emptyServiceRecord(): ServiceCosts {
  return {
    ec2: 0,
    rds: 0,
    s3: 0,
    lambda: 0,
    elb: 0,
    eks: 0,
  }
}

function emptyTeamRecord(): TeamCosts {
  return {
    platform: 0,
    backend: 0,
    frontend: 0,
    data: 0,
    security: 0,
    devops: 0,
  }
}

function emptyEnvironmentRecord(): EnvironmentCosts {
  return {
    production: 0,
    staging: 0,
    development: 0,
  }
}

function roundServiceRecord(record: ServiceCosts): ServiceCosts {
  return {
    ec2: round2(record.ec2),
    rds: round2(record.rds),
    s3: round2(record.s3),
    lambda: round2(record.lambda),
    elb: round2(record.elb),
    eks: round2(record.eks),
  }
}

function fillMissingDates(
  points: Array<{ date: string; value: number }>,
  days: number
): Array<{ date: string; value: number }> {
  if (points.length === 0) {
    return buildFlatSeries(days, 0)
  }

  const map = new Map(points.map((point) => [point.date, point.value]))
  const today = new Date()
  const output: Array<{ date: string; value: number }> = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - offset)
    const dateKey = toIsoDate(date)

    output.push({
      date: dateKey,
      value: map.get(dateKey) ?? 0,
    })
  }

  return output
}

function buildFlatSeries(days: number, value: number) {
  const today = new Date()
  const output: Array<{ date: string; value: number }> = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - offset)
    output.push({
      date: toIsoDate(date),
      value,
    })
  }

  return output
}

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date
}

async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  limit: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  const results: TOutput[] = []
  const queue = [...values]
  let index = 0

  const workers = Array.from({ length: Math.max(1, limit) }).map(async () => {
    while (queue.length > 0) {
      const value = queue.shift()
      if (value === undefined) {
        return
      }

      const mapped = await mapper(value, index)
      results.push(mapped)
      index += 1
    }
  })

  await Promise.all(workers)
  return results
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function sum(values: number[]) {
  return values.reduce((accumulator, value) => accumulator + value, 0)
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return sum(values) / values.length
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000
}
