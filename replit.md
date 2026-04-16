# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/realaize` (`@workspace/realaize`)

React + Vite frontend application (real estate portfolio manager "Realaize" by Lestate Real GmbH). Uses React Router, Zustand for state management, TailwindCSS, and Radix UI components. All data is frontend-only via Zustand with localStorage persistence (key: `restate-storage-v4`).

- Entry: `src/main.tsx`
- App: `src/App.tsx` — sets up React Router with all pages
- Requires env vars: `PORT=5000`, `BASE_PATH=/`
- Dev command: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/realaize run dev`
- Language: German UI throughout
- Store: `src/store/useStore.ts` — Zustand with persist (key: `restate-storage-v4`)
- Types: `src/models/types.ts` — all domain types including unified `PropertyData` model
- Mock data: `src/data/mockData.ts` — 3 assets, 2+ developments, 3 sales, 22 contacts, news, radar listings, appointments
- KPI engine: `src/utils/kpiEngine.ts` — legacy NOI, LTV, DSCR calculations
- Cash flow model: `src/utils/propertyCashFlowModel.ts` — new unified PropertyData-driven calculation engine (NOI, IRR, cashflow, WALT, NIY, DSCR, equity multiple)

**Unified PropertyData Model** (central to all redesigned pages):
- `PropertyData` — unified data shape flowing through Acquisition → Development → Bestand
- Fields: `unitsAsIs` + `unitsTarget` (RentRollUnit[]), `acquisitionCosts` (AcquisitionCostItem[]), `operatingCosts` (PropertyOperatingCosts), `marketAssumptions` (PropertyMarketAssumptions per usage type), `gewerke` (GewerkePosition[]), `financingTranches` (FinancingTranche[]), `holdingPeriodYears`, etc.
- `underwritingSnapshot` on `DevelopmentProject` — frozen copy of `PropertyData` at time of transfer from Acquisition
- `offers` / `invoices` on `DevelopmentProject` — tracks contractor bids and invoices per Gewerk
- Offer fields: `id, gewerkId, contractor, submittedAt, totalAmount, status (Eingegangen|In Prüfung|Beauftragt|Abgelehnt|Abgeschlossen), notes`
- Invoice fields: `id, gewerkId, contractor, invoiceNumber, invoiceDate, dueDate, totalAmount, status (Offen|Fällig|Bezahlt|Storniert), notes`

**Pages** (in `src/pages/`):
- `Portfolio.tsx` — dashboard overview
- `Assets.tsx` — asset detail with Operating Costs tab (includes `rentalGrowthRate` field)
- `Acquisition.tsx` — 8-section PropertyData-driven wizard (Stammdaten → Ankauf → Rent Roll → Opex → Markt → [Development] → Finanzierung → Cashflow → Zusammenfassung) + pipeline list with live KPIs
- `DealDashboard.tsx` — Acquisition detail page with tabs: Summary | Stammdaten | Ankauf | Rent Roll | Opex | Markt | [Development] | Finanzierung | Cashflow | Dokumente | Bilder
- `Developments.tsx` — exports `DevelopmentsPage` (list) and `DevelopmentDetailPage` (detail). Detail tabs: Summary | Stammdaten | Ankauf* (frozen from underwritingSnapshot) | Rent Roll (Ist/Ziel) | Opex | Markt | Kosten & Budget (gewerke+offers+invoices, 3-col UW comparison) | Finanzierung | Cashflow | Dokumente | Bilder
- `Sales.tsx` — sales pipeline
- `OtherPages.tsx` — CashFlow (10-year model), Markt, Documents, AI Copilot, Settings, News, Deal Radar

**Store actions** (useStore.ts):
- `transferToDevelopment(dealId)` — copies `propertyData`, creates `underwritingSnapshot` (deep copy), starts with empty `offers`/`invoices`
- `updateDealPropertyData(dealId, patch)` / `updateDevPropertyData(devId, patch)` — partial patches to PropertyData
- `addOffer/updateOffer/deleteOffer` + `addInvoice/updateInvoice/deleteInvoice` — offer/invoice CRUD on DevelopmentProject

**Cash Flow Page (10-Year Model)**:
- Located in `OtherPages.tsx` → `CashFlowPage()`
- Shows portfolio-level annual cash flows: NOI block, Transactions block, Debt block, Free Cashflow
- Base year = earliest acquisition date across all assets + developments
- `rentalGrowthRate` on `AssetOperatingCosts` (default 2.0%) controls annual rent indexation
- Sales linked via `SaleObject.sourceId` matching `asset.id` or `development.id`
- Developments contribute capex during construction, rent after `plannedEndDate`
- Table: 10 year columns + Total, expandable sections, sticky row labels
- KPI cards: NOI 10J Gesamt, Ø NOI p.a., Free Cashflow 10J, Verkaufserlöse gesamt
- Chart: ComposedChart — NOI bars + Free CF bars + Cumulative line

## Replit Setup

- **Node.js**: nodejs-24 module
- **Package manager**: pnpm (v10+)
- **Database**: Replit PostgreSQL (DATABASE_URL auto-provisioned)
- **Workflows**:
  - `Start application` — Frontend on port 5000 (webview)
  - `Backend API` — Express API on port 3001 (console)
- **Environment variables**: PORT=5000, BASE_PATH=/, API_PORT=3001 (set in shared env)
