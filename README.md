# SA Motors — DealerOS v4 (Next.js)

A Next.js 16 + Tailwind v4 rebuild of the DealerOS v4 dealer management UI, backed by a local Excel workbook.

## Scope

Four modules from the sidebar are implemented (all other sidebar items are visually present but disabled):

- **Dashboard** — `/`
- **Current Stock** — `/stock`
- **Sold History** — `/sold`
- **Sell a Car** — `/sell`

UI, styling, and structure mirror the original `DealerOS_v4_TRIAL_sanitised.html` pixel-for-pixel.

## Data source

A local Excel workbook at:

```
app/data/Master_Spreadsheet_TRIAL_sanitised.xlsx
```

All reads and writes go directly against this file via [`exceljs`](https://github.com/exceljs/exceljs). No external services or credentials are required.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Workbook structure (do not modify)

| Tab | Used by | Header row |
|---|---|---|
| Front Sheet | Dashboard (monthly summary) | row 3 |
| Stock Data | Current Stock | row 2 (leading blank col A) |
| Sold Stock | Sold History | row 2 |

Column order and names match the workbook exactly — see `lib/types.ts`. **Do not rename or reorder** columns; the app relies on position.

## API routes

- `GET /api/dashboard` — monthly + stock + sold rollup
- `GET /api/counts` — sidebar badge counts (live stock + sold totals)
- `GET|POST|PATCH|DELETE /api/stock` — CRUD on **Stock Data**
- `GET|POST|PATCH|DELETE /api/sold` — CRUD on **Sold Stock**
- `POST /api/sell` — sell a vehicle (appends to Sold Stock, marks stock row as "Sold")

`POST` body matches the row schema (omit `rowNumber`). `PATCH` requires `{ rowNumber, ...fields }`. `DELETE` requires `?rowNumber=`.

> ⚠️ Writes mutate the local `.xlsx` file in place. Keep a backup of the workbook before testing CRUD.

## Project layout

```
app/
  layout.tsx             Root layout (Sidebar + Topbar shell)
  page.tsx               Dashboard
  stock/page.tsx         Current Stock
  sold/page.tsx          Sold History
  sell/page.tsx          Sell a Car (invoice generation)
  api/                   CRUD routes + sell endpoint
  data/
    Master_Spreadsheet_TRIAL_sanitised.xlsx
components/
  Sidebar.tsx, Topbar.tsx, Shell.tsx
  QuickAddModal.tsx, AddVehicleModal.tsx
lib/
  xlsx.ts                ExcelJS read/write wrapper
  types.ts               Sheet column definitions + row types
  format.ts              £ / date / month helpers
```

## Newly Added Features

### 1. Sell a Car Module (`/sell`)

A three-step vehicle sale flow accessible from the sidebar and Quick Add modal.

**Step 1 — Find Vehicle:** Search by registration plate against live stock. Displays vehicle details (make/model, plate, total cost, investor, source, days in stock).

**Step 2 — Sale Details:** Enter sale price, select investor, investor share %, and sale date. A live calculation panel shows gross profit and investor share updating in real time.

**Step 3 — Generate Invoice:** Clicking "Generate SA Motors (TRIAL TASK) Invoice":
- Appends a row to the **Sold Stock** sheet (at the bottom)
- Marks the stock row Status as "Sold" (preserves spreadsheet formulas — does not delete the row)
- Renders a printable investor invoice with cost breakdown, profit, and investor share
- Fires a `vehicle-added` event so sidebar counts refresh immediately
- Provides a "Print / PDF" button that opens a clean print window

### 2. Real-Time Sidebar Badge Counts

Sidebar badge counts for "Current Stock" and "Sold History" now refresh immediately after adding a vehicle or selling a vehicle. `Shell` listens for the `vehicle-added` window event and re-fetches `/api/counts`.

### 3. Reverse Display Order (Newest First)

Both Current Stock and Sold History pages display rows in reverse order — the most recently added vehicle or sale appears at the top of the table.

### 4. Quick Add — Sell a Car Enabled

The "Sell a Car" tile in the Quick Add modal is now enabled and navigates to `/sell` when clicked.

## Testing

```bash
npm test              # run all tests
npm run test:coverage # with coverage report
npm run test:watch    # watch mode
```

Test files for new features:

| Feature | Test File | Tests |
|---------|-----------|-------|
| Sell API route | `__tests__/api/sell.test.ts` | 5 |
| Sell a Car page | `__tests__/app/sell-page.test.tsx` | 7 |
| QuickAddModal | `__tests__/components/QuickAddModal.test.tsx` | 8 |
| Shell badge refresh | `__tests__/components/Shell.test.tsx` | 6 |
