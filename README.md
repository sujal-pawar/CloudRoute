# Cloud Cost Optimization Dashboard

An interactive FinOps demo built with Next.js App Router and TypeScript.

The app simulates a cloud cost control workflow across six teams and multiple services.
It includes idle resource analysis, recommendation tracking, anomaly detection, budget alerting,
and realized-vs-projected savings tracking.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Recharts
- Sonner (toasts)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

The home route redirects to `/dashboard`.

## Main Pages

- `/dashboard`: KPI overview, cost trends, breakdown charts, team optimization table.
- `/idle-resources`: sortable list of idle/stopped resources and estimated monthly waste.
- `/recommendations`: actionable optimization recommendations with quick actions.
- `/anomalies`: seeded anomaly feed and impact summary.
- `/alerts`: budget guardrails with rule management and breach history.
- `/savings-tracker`: realized savings timeline and acted recommendation outcomes.

## Demo and Data Notes

- Data is deterministic and generated in-memory from seeded mock generators.
- The debug endpoint is available at `/api/debug` and returns summary + source datasets.
- Alerts are evaluated on load so pre-breached demo rules appear immediately.
- Savings are persisted in module-level server state during the current server session.

## API Overview

- `GET /api/costs`: cost time series (`period`, `groupBy`).
- `GET /api/resources`: cloud resource inventory.
- `GET /api/idle`: idle/stopped resource opportunities.
- `GET/POST /api/recommendations`: recommendation list and state updates.
- `GET/POST /api/alerts`: alert rules and breach checks.
- `PATCH/DELETE /api/alerts/[id]`: update or delete a specific alert rule.
- `GET /api/savings`: savings tracker data.
- `GET /api/debug`: full debug payload for verification.

## Validation Commands

```bash
npm run lint
```

Use `/api/debug` to verify dataset realism and seeded anomalies during demos.
