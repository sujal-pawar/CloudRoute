# FinOps Cloud Cost Optimization Dashboard — Agent Instructions
## PS-004 | Hack Carnival 2026

---

## 🎯 Project Overview

Build a **FinOps Cloud Cost Optimization Dashboard** — a full-stack Next.js web application that gives engineering and finance teams real-time visibility into cloud resource usage, automatically identifies wasteful/idle resources, and delivers actionable optimization recommendations with projected dollar savings.

This is a **hackathon project (8 hours)** — focus on a working, impressive demo over perfect production code.

---

## 🛠️ Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | React Server Components + Client Components |
| **Styling** | Tailwind CSS v3 | Dark mode via `class` strategy |
| **Charts** | Recharts | Line, Bar, Area, Pie charts |
| **UI Components** | shadcn/ui | Pre-built accessible components |
| **Icons** | Lucide React | Consistent icon set |
| **Backend API** | Next.js API Routes (Node.js) | `/app/api/` directory |
| **Data Store** | In-memory JSON (server state) | No DB needed — mock data engine |
| **Notifications** | React Toast (sonner) | Budget alert notifications |
| **State Management** | Zustand | Client-side app state |
| **TypeScript** | TypeScript 5 | Full type safety |

---

## 📁 Project Structure

```
finops-dashboard/
├── app/
│   ├── layout.tsx              # Root layout with sidebar + topbar
│   ├── page.tsx                # Overview dashboard (redirect to /dashboard)
│   ├── dashboard/
│   │   └── page.tsx            # Main cost overview dashboard
│   ├── idle-resources/
│   │   └── page.tsx            # Idle resource detection page
│   ├── recommendations/
│   │   └── page.tsx            # Rightsizing recommendations
│   ├── alerts/
│   │   └── page.tsx            # Budget alerts configuration + history
│   ├── savings-tracker/
│   │   └── page.tsx            # Realized savings tracker
│   ├── anomalies/
│   │   └── page.tsx            # Cost anomaly detection
│   └── api/
│       ├── costs/
│       │   └── route.ts        # GET /api/costs — cost breakdown data
│       ├── resources/
│       │   └── route.ts        # GET /api/resources — all cloud resources
│       ├── idle/
│       │   └── route.ts        # GET /api/idle — idle resource detection
│       ├── recommendations/
│       │   └── route.ts        # GET /api/recommendations — rightsizing suggestions
│       ├── alerts/
│       │   ├── route.ts        # GET/POST /api/alerts — budget alert rules
│       │   └── [id]/
│       │       └── route.ts    # PATCH/DELETE /api/alerts/[id]
│       ├── anomalies/
│       │   └── route.ts        # GET /api/anomalies — cost spikes
│       ├── savings/
│       │   └── route.ts        # GET /api/savings — realized savings
│       └── act/
│           └── route.ts        # POST /api/act — mark recommendation as acted on
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Left sidebar navigation
│   │   └── TopBar.tsx          # Top bar with team selector + alerts bell
│   ├── dashboard/
│   │   ├── KPICard.tsx         # Total spend, savings opportunity, waste % KPI cards
│   │   ├── CostBreakdownChart.tsx   # Stacked bar by service/team/env
│   │   ├── CostTrendChart.tsx       # Line chart daily/weekly/monthly
│   │   ├── TeamSpendTable.tsx       # Team-level spend table
│   │   └── OptimizationScoreCard.tsx # Efficiency score per team
│   ├── idle/
│   │   ├── IdleResourceTable.tsx    # Flagged idle resources table
│   │   └── IdleResourceCard.tsx     # Individual idle resource card
│   ├── recommendations/
│   │   ├── RecommendationCard.tsx   # Individual recommendation with savings
│   │   └── ActButton.tsx            # Mark as acted on button
│   ├── alerts/
│   │   ├── AlertRuleForm.tsx        # Create/edit budget alert rules
│   │   ├── AlertRuleList.tsx        # List of configured alerts
│   │   └── AlertToast.tsx           # Toast notification for breached alerts
│   ├── anomalies/
│   │   └── AnomalyChart.tsx         # Spike detection chart with annotations
│   ├── savings/
│   │   └── SavingsTimeline.tsx      # Realized savings tracker chart
│   └── ui/                          # shadcn/ui base components
├── lib/
│   ├── mock-data/
│   │   ├── generator.ts         # Core mock data generator (MUST READ)
│   │   ├── resources.ts         # Cloud resource definitions
│   │   ├── costs.ts             # Billing cost time-series data
│   │   └── anomalies.ts         # Pre-seeded anomaly events
│   ├── engine/
│   │   ├── idle-detector.ts     # Idle resource detection logic
│   │   ├── rightsizing.ts       # Rightsizing recommendation engine
│   │   ├── anomaly-detector.ts  # Cost anomaly spike detection
│   │   ├── alert-checker.ts     # Budget threshold checker
│   │   └── score-calculator.ts  # Team optimization score calculator
│   ├── store/
│   │   └── useAppStore.ts       # Zustand store (alerts state, acted recommendations)
│   ├── types.ts                 # All TypeScript interfaces
│   └── utils.ts                 # formatCurrency, formatDate, etc.
├── public/
│   └── favicon.ico
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 🗂️ Data Model — TypeScript Types (`lib/types.ts`)

```typescript
// ============================================================
// CLOUD RESOURCES
// ============================================================

export type ResourceType = 'ec2' | 'rds' | 's3' | 'lambda' | 'elb' | 'eks';
export type Environment = 'production' | 'staging' | 'development';
export type Team = 'platform' | 'backend' | 'frontend' | 'data' | 'security' | 'devops';
export type ResourceStatus = 'active' | 'idle' | 'stopped' | 'terminated';

export interface CloudResource {
  id: string;
  name: string;
  type: ResourceType;
  environment: Environment;
  team: Team;
  region: string;
  status: ResourceStatus;
  monthlyCost: number;          // USD per month
  hourlyCost: number;           // USD per hour
  tier: string;                 // e.g., "t3.large", "db.r5.xlarge"
  createdAt: string;            // ISO date string
  tags: Record<string, string>;
  usageMetrics: UsageMetrics;
}

export interface UsageMetrics {
  avgCpuPercent: number;        // 0–100
  avgMemoryPercent: number;     // 0–100
  avgNetworkMbps: number;       // MB/s
  avgDiskIops: number;          // IOPS for storage
  peakHours: number[];          // Hours of day (0-23) with high usage
  lastActiveAt: string;         // ISO date — when last had real traffic
  dailyUsage: DailyUsage[];     // 30-day usage history
}

export interface DailyUsage {
  date: string;
  cpuPercent: number;
  memoryPercent: number;
  networkMbps: number;
  cost: number;
}

// ============================================================
// COSTS & BILLING
// ============================================================

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
  optimizationScore: number;   // 0–100
  budget?: number;             // monthly budget if set
}

// ============================================================
// IDLE RESOURCES
// ============================================================

export interface IdleResource {
  resource: CloudResource;
  idleReason: string;          // e.g., "CPU < 2% for 14 days"
  idleDays: number;
  monthlySavings: number;      // savings if terminated
  recommendation: 'terminate' | 'resize' | 'schedule-shutdown';
  confidence: number;          // 0–100 — how confident the engine is
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

export interface Recommendation {
  id: string;
  resourceId: string;
  resourceName: string;
  type: 'rightsize' | 'terminate' | 'schedule-shutdown' | 'reserved-instance';
  currentTier: string;
  suggestedTier: string;
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  reasoning: string;
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'acted' | 'dismissed';
  actedAt?: string;
  actualSavingsToDate?: number;
}

// ============================================================
// BUDGET ALERTS
// ============================================================

export interface AlertRule {
  id: string;
  name: string;
  scope: 'team' | 'service' | 'environment' | 'total';
  scopeValue: string;          // e.g., "backend", "ec2", "production"
  threshold: number;           // USD
  thresholdType: 'absolute' | 'percent-of-budget';
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

// ============================================================
// ANOMALIES
// ============================================================

export interface CostAnomaly {
  id: string;
  detectedAt: string;
  resourceId: string;
  resourceName: string;
  team: Team;
  service: ResourceType;
  baselineCost: number;        // expected daily cost
  actualCost: number;          // actual daily cost
  spikePercent: number;        // % above baseline
  estimatedExtra: number;      // extra $ spent
  possibleCause: string;       // e.g., "Traffic spike on prod-api-server"
  resolved: boolean;
}

// ============================================================
// SAVINGS TRACKER
// ============================================================

export interface SavingsEntry {
  recommendationId: string;
  resourceName: string;
  actedAt: string;
  projectedMonthlySavings: number;
  actualSavingsByDay: { date: string; saving: number }[];
  totalRealizedSavings: number;
}
```

---

## 🔧 Mock Data Engine (`lib/mock-data/generator.ts`)

This is the most important file. The mock data must be **realistic** — judges will look at it.

### Resource Definitions (seed at module level — do NOT regenerate on every request)

Generate exactly **47 cloud resources** across:
- **Teams**: platform (8), backend (10), frontend (7), data (9), security (5), devops (8)
- **Types**: ec2 (15), rds (8), s3 (10), lambda (7), elb (4), eks (3)
- **Environments**: production (18), staging (15), development (14)
- **Regions**: us-east-1 (20), us-west-2 (12), eu-west-1 (10), ap-southeast-1 (5)

### Usage Metrics Rules (this is what makes idle detection non-trivial)

For each resource, generate 30-day daily usage history:
- **Idle resources** (~30% of total): avgCpuPercent 0.5–3%, peakHours empty or only 1–2 hours, lastActiveAt > 7 days ago
- **Business-hours-only resources** (~20% of total): peakHours [9,10,11,12,13,14,15,16,17], very low usage outside those hours
- **Healthy active resources** (~50% of total): avgCpuPercent 20–75%, varied peakHours

### Cost Data (90 days of daily billing)

Generate 90 days of `CostDataPoint[]` with:
- Base cost per resource type: EC2 ~$0.15/hr, RDS ~$0.25/hr, S3 ~$0.023/GB/month (estimate $5–80/month per bucket), Lambda ~$0.20 per 1M requests
- Realistic variance: ±15% daily fluctuation
- **3 pre-seeded anomaly events** on specific dates where one resource 3× normal cost
- **Weekend dip**: production costs drop ~20% on Sat/Sun, development drops ~60%
- Total monthly spend should be ~$28,000–$35,000

### Rightsizing Tiers (pricing reference)

```
EC2:  t3.micro($8.5/mo) → t3.small($17/mo) → t3.medium($34/mo) → t3.large($68/mo) → t3.xlarge($135/mo)
      m5.large($70/mo) → m5.xlarge($140/mo) → m5.2xlarge($280/mo)
      c5.large($62/mo) → c5.xlarge($124/mo)

RDS:  db.t3.micro($15/mo) → db.t3.small($30/mo) → db.t3.medium($60/mo)
      db.r5.large($175/mo) → db.r5.xlarge($350/mo)

Lambda: Already serverless — recommend reserved concurrency tuning
ELB: $16–22/mo fixed + data transfer
```

---

## ⚙️ Detection Engines

### `lib/engine/idle-detector.ts`

Flag a resource as **idle** if ANY of:
1. `avgCpuPercent < 5%` AND `lastActiveAt` > 7 days ago
2. `avgNetworkMbps < 0.1` for 14+ consecutive days
3. `avgDiskIops < 10` for storage (S3 buckets with near-zero access)
4. Lambda: invocation count < 10/day for 14 days

For each idle resource, compute:
- `idleReason`: human-readable string explaining exactly which metric triggered it
- `idleDays`: days since last meaningful activity
- `monthlySavings`: full monthly cost if terminated (or partial if rightsized)
- `confidence`: 95 if ALL metrics idle, 75 if one metric is borderline

### `lib/engine/rightsizing.ts`

For every EC2/RDS resource:
1. If `avgCpuPercent < 20%` → suggest one tier down
2. If `avgCpuPercent < 10%` → suggest two tiers down
3. If `avgMemoryPercent < 15%` → also flag for downsizing
4. Compute: `monthlySavings = currentMonthlyCost - suggestedTierCost`
5. Generate `reasoning`: e.g., "Average CPU 8.3% over 30 days — c5.xlarge ($124/mo) is oversized. Rightsizing to c5.large ($62/mo) saves $62/month."
6. Skip resources in production with CPU > 15% (too risky to recommend)

### `lib/engine/anomaly-detector.ts`

Compare each day's cost to the 7-day rolling average baseline:
1. If `dailyCost > baseline * 1.5` → flag as anomaly (50% spike)
2. Compute `spikePercent` and `estimatedExtra`
3. For pre-seeded anomalies, set `possibleCause` to a specific realistic reason
4. For detected anomalies, use pattern: "Unusual spend on {resource.name} — {resource.type.toUpperCase()} in {resource.environment}"

### `lib/engine/score-calculator.ts`

Per team optimization score (0–100):
```
score = 100
  - (idleCount / totalCount) * 40        // penalize idle resources heavily
  - (pendingRecommendationCount * 3)      // penalize unacted recommendations
  - (anomalyCount * 5)                    // penalize anomalies
  + (actedRecommendationCount * 5)        // reward acting on recommendations
```
Clamp between 0–100.

### `lib/engine/alert-checker.ts`

On every API call to `/api/costs`, run the alert checker:
1. For each `AlertRule`, compute `currentSpend` for the scope (sum costs for team/service/env)
2. If `currentSpend >= threshold` AND rule was not already breached → set `breached = true`, `lastTriggeredAt = now`, add to `AlertEvent` log
3. Return breached alerts so the frontend can fire toast notifications

---

## 🖥️ Pages & Components

### `/dashboard` — Main Overview (Most Important Page)

**Layout**: Sidebar (left, 240px) + TopBar + main content area

**Section 1 — KPI Row (4 cards)**
- **Total This Month**: sum of all costs, compare to last month (↑/↓ % change)
- **Waste Identified**: sum of idle + oversized resource costs
- **Savings Opportunity**: total projected savings from all pending recommendations
- **Avg Optimization Score**: average score across all teams (0–100)

**Section 2 — Cost Trend (Line Chart)**
- 90-day daily cost line chart
- Toggle: Daily / Weekly / Monthly aggregation
- Overlay: show anomaly markers as red dots on the line

**Section 3 — Cost Breakdown (Stacked Bar Chart)**
- X-axis: last 30 days
- Toggle between: By Service | By Team | By Environment
- Each bar stack colored per category
- Tooltip shows breakdown values

**Section 4 — Team Table**
- Columns: Team | This Month | vs Last Month | Resources | Idle | Score | Budget | Actions
- Sortable columns
- Color-coded score badge (green 80+, yellow 60–79, red <60)
- Click row → drills into team detail

### `/idle-resources` — Idle Detection Page

**Header**: "X resources flagged as idle — $Y,YYY/mo waste"

**Filters**: Environment dropdown | Resource Type | Team | Min Idle Days slider

**Table columns**:
- Resource Name (with type icon)
- Team | Environment
- Idle Reason (e.g., "CPU 1.2% avg, inactive 14 days")
- Monthly Cost
- Potential Savings
- Confidence badge
- Recommended Action chip (Terminate / Resize / Schedule)
- Act button (opens confirm modal)

**Mini sparkline** for each row showing 14-day CPU usage trend (tiny inline chart)

### `/recommendations` — Rightsizing Page

**Summary bar**: Total pending recommendations | Total savings opportunity | Easy wins (low effort)

**Cards** (not table — more visual impact for judges):

Each `RecommendationCard` shows:
- Resource name + type icon + environment badge
- Current tier → Suggested tier (with arrow)
- Current cost vs Projected cost (large, bold)
- Monthly savings (green, prominent)
- Annual savings (smaller, below)
- Reasoning text (1-2 sentences)
- Effort badge (Low/Medium/High)
- "Act on This" button → marks as acted, updates savings tracker
- "Dismiss" ghost button

Filter: Show All | Pending | Acted | Dismissed
Sort: By Savings ↓ | By Effort | By Team

### `/alerts` — Budget Alerts Page

**Two-panel layout**:

Left panel: Alert Rules List
- Each rule: Scope + threshold + current spend + progress bar (spend vs threshold)
- Red if breached, yellow if >80%, green if safe
- Edit / Delete buttons

Right panel: Create/Edit Alert Form
- Fields: Alert Name, Scope (team/service/environment/total), Scope Value dropdown, Threshold ($), 
- Toggle: absolute $ threshold OR % of monthly budget

**Alert History** section (below):
- Table of recent alert events: When | Rule | Spend | Threshold | Status

### `/anomalies` — Cost Anomaly Page

**Chart**: Line chart of daily total cost with anomaly events marked as red vertical bands

**Anomaly Cards** below chart:
- Date | Resource | Team | Baseline vs Actual | Extra $ | Possible Cause
- Resolve button (marks as resolved, removes from active list)

### `/savings-tracker` — Savings Tracker Page

**Summary KPIs**:
- Total Projected Savings (from all acted recommendations)
- Total Realized Savings (tracked actual)
- Realization Rate (%)

**Chart**: Cumulative savings line chart since first acted recommendation

**Table**: Each acted recommendation, projected vs actual savings to date, resource name, acted date

---

## 🎨 Design System

### Color Palette (Dark-First Dashboard)

```css
/* Use Tailwind's dark mode config: class strategy */
/* Hardcode in tailwind.config.ts */

colors: {
  background: { DEFAULT: '#0f1117', card: '#161b27', border: '#1e2535' },
  text: { primary: '#e2e8f0', muted: '#94a3b8', faint: '#475569' },
  accent: { 
    teal: '#14b8a6',    /* primary actions, positive values */
    red: '#ef4444',     /* waste, overspend, alerts */
    amber: '#f59e0b',   /* warnings, medium risk */
    green: '#22c55e',   /* savings, optimization, good scores */
    blue: '#3b82f6',    /* info, EC2, production */
    purple: '#a855f7',  /* data team, anomalies */
  }
}
```

**Chart colors** (assign consistently across ALL charts):
- EC2: `#3b82f6` (blue)
- RDS: `#8b5cf6` (violet)  
- S3: `#f59e0b` (amber)
- Lambda: `#22c55e` (green)
- ELB: `#06b6d4` (cyan)
- EKS: `#f97316` (orange)

**Team colors**:
- platform: `#3b82f6`, backend: `#8b5cf6`, frontend: `#22c55e`, data: `#f59e0b`, security: `#ef4444`, devops: `#06b6d4`

### Typography

Use **Geist** (Vercel's font) — it's perfect for dashboards.
```tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```
All cost/number values: `font-variant-numeric: tabular-nums` (`font-mono` in Tailwind)

### Component Rules
- All cards: `rounded-xl bg-background-card border border-background-border`
- KPI values: `text-2xl font-bold tabular-nums` (capped — this is a web app)
- Positive change: `text-accent-green`
- Negative change (overspend): `text-accent-red`
- Badges: pill shape, small, colored background at 20% opacity

---

## 🔌 API Routes

### `GET /api/costs?period=30d&groupBy=service`
Returns `CostDataPoint[]` for the requested period, with breakdown by the groupBy dimension.
Also runs `alert-checker` and includes `{ alerts: AlertEvent[] }` in response for triggered alerts.

### `GET /api/resources`
Returns all 47 `CloudResource[]` — used for team table, resource lookup.

### `GET /api/idle`
Runs `idle-detector` on all resources, returns `IdleResource[]` sorted by monthlySavings desc.

### `GET /api/recommendations`
Runs `rightsizing` engine, returns `Recommendation[]`.
Merges with acted/dismissed status from server-side state.

### `POST /api/act` — Body: `{ recommendationId: string }`
Marks recommendation as acted on. Starts tracking actual savings (simulated as 85% of projected).
Returns updated `Recommendation`.

### `GET /api/anomalies`
Returns `CostAnomaly[]` — both pre-seeded and dynamically detected from cost data.

### `GET /api/alerts`
Returns `AlertRule[]` with current spend computed.

### `POST /api/alerts` — Body: `Omit<AlertRule, 'id' | 'breached' | ...>`
Creates new alert rule. Returns created `AlertRule`.

### `PATCH /api/alerts/[id]` — Body: `Partial<AlertRule>`
Updates alert rule threshold or name.

### `DELETE /api/alerts/[id]`
Removes alert rule.

### `GET /api/savings`
Returns `SavingsEntry[]` for all acted recommendations.

---

## ⏱️ 8-Hour Build Timeline

### Hour 1 — Setup & Data Foundation (CRITICAL — DO THIS FIRST)
- [ ] `npx create-next-app@latest finops-dashboard --typescript --tailwind --app`
- [ ] Install dependencies: `recharts zustand sonner lucide-react geist`
- [ ] Install shadcn/ui: `npx shadcn@latest init`
- [ ] Add shadcn components: `npx shadcn@latest add button card badge table dialog select tabs`
- [ ] Configure Tailwind with custom colors in `tailwind.config.ts`
- [ ] Create `lib/types.ts` with ALL TypeScript interfaces
- [ ] Create `lib/mock-data/generator.ts` — the full mock data engine with 47 resources + 90 days billing data
- [ ] Create `lib/utils.ts` — `formatCurrency`, `formatPercent`, `formatDate`
- [ ] Verify mock data in browser: create a temporary `/api/debug` route that dumps raw data

### Hour 2 — Detection Engines + API Routes
- [ ] `lib/engine/idle-detector.ts`
- [ ] `lib/engine/rightsizing.ts`
- [ ] `lib/engine/anomaly-detector.ts`
- [ ] `lib/engine/alert-checker.ts`
- [ ] `lib/engine/score-calculator.ts`
- [ ] All 8 API routes (`/api/costs`, `/api/resources`, `/api/idle`, `/api/recommendations`, `/api/act`, `/api/anomalies`, `/api/alerts`, `/api/savings`)
- [ ] Test each API route directly in browser (`/api/costs`, `/api/idle`, etc.)

### Hour 3 — Layout + Dashboard Shell
- [ ] `components/layout/Sidebar.tsx` — navigation links to all 5 pages
- [ ] `components/layout/TopBar.tsx` — team selector, alerts bell (shows unread count), dark mode toggle
- [ ] Root `app/layout.tsx` wiring Sidebar + TopBar + main content
- [ ] `lib/store/useAppStore.ts` — Zustand store for alerts state
- [ ] Alert toast integration with `sonner`

### Hour 4 — Main Dashboard Page
- [ ] `components/dashboard/KPICard.tsx`
- [ ] `components/dashboard/CostTrendChart.tsx` — 90-day line chart with anomaly markers
- [ ] `components/dashboard/CostBreakdownChart.tsx` — stacked bar with service/team/env toggle
- [ ] `components/dashboard/TeamSpendTable.tsx` — sortable, color-coded scores
- [ ] Wire `/dashboard/page.tsx` — fetch from API routes, compose components

### Hour 5 — Idle Resources + Recommendations Pages
- [ ] `components/idle/IdleResourceTable.tsx` — with mini sparklines
- [ ] `/idle-resources/page.tsx` — filters + table
- [ ] `components/recommendations/RecommendationCard.tsx`
- [ ] `/recommendations/page.tsx` — card grid with filter tabs
- [ ] Wire "Act on This" to `POST /api/act`

### Hour 6 — Alerts + Anomalies Pages
- [ ] `components/alerts/AlertRuleForm.tsx`
- [ ] `components/alerts/AlertRuleList.tsx` — with spend progress bars
- [ ] `/alerts/page.tsx` — two-panel layout
- [ ] `components/anomalies/AnomalyChart.tsx` — annotated line chart
- [ ] `/anomalies/page.tsx`
- [ ] Wire alert breach toasts to Sonner globally in layout

### Hour 7 — Savings Tracker + Polish
- [ ] `components/savings/SavingsTimeline.tsx`
- [ ] `/savings-tracker/page.tsx`
- [ ] Add skeleton loaders to all data-loading components
- [ ] Add empty states to tables when no results match filters
- [ ] Polish: responsive behavior, hover states, loading states

### Hour 8 — Demo Prep
- [ ] Final bug fixes
- [ ] Verify all 5 pages work end-to-end
- [ ] Make sure at least 2 alerts are pre-breached so judges can see toast notifications immediately
- [ ] Create 3 pre-acted recommendations so savings tracker has data
- [ ] Verify mock data totals are impressive: ~$32K/month spend, ~$7K savings opportunity
- [ ] Test the full demo flow (see Demo Script below)

---

## 🎭 Demo Script (Judge Walkthrough — 3 minutes)

1. **Open `/dashboard`** — "Here's our FinOps dashboard. We're tracking $32,400 in monthly cloud spend across 47 resources and 6 teams."

2. **Point to KPIs** — "We've identified $7,200 in monthly waste. That's a 22% optimization opportunity."

3. **Show anomaly markers on trend chart** — "The red dots show cost anomalies — spikes above baseline. Click one to see what caused it."

4. **Switch breakdown to 'By Team'** — "We can see the data team is the biggest spender this month, up 18% vs last month."

5. **Navigate to `/idle-resources`** — "Our idle detector flagged 14 resources burning $3,400/month with near-zero CPU. Here's a dev RDS instance — 0.8% CPU average for 19 days. We recommend terminating it."

6. **Navigate to `/recommendations`** — "The rightsizing engine found 11 over-provisioned EC2s. This m5.2xlarge is using 8% CPU — downsize to m5.large and save $140/month."

7. **Click "Act on This"** — "Acting on a recommendation moves it to the savings tracker."

8. **Navigate to `/alerts`** — "The backend team just breached their $8,000 budget. The alert fired automatically — you can see it here and configure new thresholds."

9. **Navigate to `/savings-tracker`** — "Recommendations we've acted on are tracked here. $1,240 in realized savings so far this month."

---

## ✅ Hackathon Constraint Checklist

Before submitting, verify every constraint from PS-004:

- [ ] **Realistic dataset** — 47 resources, 90 days of billing data, NOT 3 rows of fake data
- [ ] **Cost breakdown by service, team, AND environment** — all three views on dashboard
- [ ] **Idle detection uses actual usage metrics** — CPU%, memory%, network Mbps (NOT just resource age)
- [ ] **Recommendations include projected $ savings** — every recommendation has `monthlySavings` and `annualSavings`
- [ ] **Alerts actually trigger and deliver** — Sonner toast fires when budget threshold breached
- [ ] **Dashboard updates dynamically** — auto-refresh every 30 seconds, manual refresh button
- [ ] **Daily/weekly/monthly views** — time period toggle on all charts
- [ ] **Rightsizing with specific tier suggestions** — "Downsize from m5.2xlarge to m5.large"
- [ ] **Scheduled shutdown suggestions** — detected via business-hours-only usage pattern
- [ ] **Budget alerts with functional delivery** — create alert → breach → toast notification fires
- [ ] **Optimization score per team** — visible in team table and per-team pages
- [ ] **Cost anomaly detection** — spike detected vs 7-day rolling baseline
- [ ] **Savings tracker** — post-act tracking with realized vs projected

---

## 🚀 Quick Start Commands

```bash
npx create-next-app@latest finops-dashboard --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd finops-dashboard
npm install recharts zustand sonner lucide-react geist
npx shadcn@latest init
npx shadcn@latest add button card badge table dialog select tabs separator progress tooltip
```

---

## ⚠️ Critical Rules (DO NOT VIOLATE)

1. **Seed mock data at module load time** — use a module-level `const RESOURCES = generateResources()`. Never regenerate on each request or data will change with every API call.
2. **Server-side state for alert rules and acted recommendations** — use a module-level `let` store in the API route file (not a database), so state persists within a single server session.
3. **No localStorage** — Next.js API routes are server-side. Client state via Zustand only.
4. **Recharts must use `ResponsiveContainer`** — always wrap charts in `<ResponsiveContainer width="100%" height={300}>`.
5. **All money values use `formatCurrency()`** — never raw `$${value}`. Use `Intl.NumberFormat`.
6. **tabular-nums on all numbers in tables** — use `font-mono` Tailwind class or `font-variant-numeric: tabular-nums`.
7. **Auto-refresh** — add a `setInterval` in the dashboard to refetch `/api/costs` every 30 seconds and update the "last updated" timestamp. This proves the dashboard is live, not static.
8. **Never block the main thread** — all data fetching must be async/await. Use React Suspense boundaries for each major section.

---

## 💡 Differentiation Tips (Score Extra Points)

1. **AI Summary Card** — Add a card on the dashboard that calls an LLM API (OpenAI/Gemini) with the cost data and returns a 3-sentence "Cost Health Report" in natural language. Even a basic prompt gives huge demo impact.

2. **CSV Export** — Add an "Export CSV" button to the recommendations table. Judges love to see real data exportability.

3. **Optimization Score Animation** — Animate the score number when it changes after acting on a recommendation. Watch the score go from 64 → 69 with a smooth count-up animation.

4. **Interactive Alert Demo** — On the `/alerts` page, add a "Simulate Breach" button that instantly sets a team's spend above threshold and fires the toast. Perfect for a live demo.

5. **Global Search** — Add Cmd+K command palette that searches across resources, teams, and recommendations. Uses Zustand store.

