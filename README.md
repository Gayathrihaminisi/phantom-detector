# Phantom Stock-Out Detector
### AI-Powered Inventory Risk Monitoring System — AP Talent Hackathon 2026

**Phantom Stock-Out Detector** is an explainable, responsive web application engineered for supermarket managers and retail floor teams. It bridges the critical operational gap between what an inventory database reports and what is physically present on store shelves.

By analyzing checkout sales velocities, demand baselines, and recorded closing stock, the system automatically flags suspected "phantom" stock-outs, calculates estimated sales at risk in **Indian Rupees (INR — ₹)**, prioritizes a daily **Top 20 Shelf Inspection List**, and tracks physical verification audit outcomes.

---

## 1. Problem Statement

In modern supermarkets, inventory discrepancies frequently occur when products show positive quantities in the inventory management system (ERP/POS), but are actually absent from customer-facing shelves due to:
- Misplaced items in incorrect aisles or backrooms
- Unrecorded shrinkage and theft
- Damaged, unrecorded, or expired stock
- Shelf restock delays despite backroom presence

Traditional systems rely either on manual cycle counting (labor-intensive and slow) or naive out-of-stock alarms that only fire when book inventory hits zero. **Phantom Stock-Out Detector** catches the invisible stock-outs — when book stock is positive, but checkout sales suddenly cease or drop dramatically below historical baselines.

---

## 2. Key Features

1. **Manager & Supermarket Registration**:
   - Organization-centric profile registration with required Supermarket Name.
   - Mock demo authentication with one-click demo credentials (`demo@phantomstock.com` / `Demo@1234`).
2. **Slide-by-Slide Guided Onboarding**:
   - 4-slide onboarding flow with forward/backward progress retention.
   - Slide 1: Welcome & Overview.
   - Slide 2: Supermarket Details Confirmation.
   - Slide 3: CSV Format Specifications & Sample Download.
   - Slide 4: Real-time Data Preparation Pipeline with visual stages.
3. **Automated CSV Data Cleaning Pipeline**:
   - Normalization of header synonyms (e.g. `MRP`, `Price` -> `selling_price`; `Units Sold`, `Sales` -> `units_sold`).
   - YYYY-MM-DD date validation and conversion.
   - Non-negative validation for quantities and prices.
   - Exact duplicate and composite-key (`date + store_id + product_id`) deduplication.
   - Inferred historical daily sales baselines from dataset history.
   - Downloadable cleaning report and sample CSV template.
   - **Strict Privacy Rule**: No file size in bytes/KB/MB is displayed anywhere in the UI.
4. **Explainable Rule-Based Anomaly Detection Engine**:
   - Transparent scoring based on 5 configurable factors (Unexpected zero sales, Sales velocity drop, Stock-demand disparity, Inactivity gap, Promotion stoppage).
   - Partial evidence confidence scaling.
   - Capped at 100 with clear risk categories (Critical, High, Medium, Low).
   - Natural slow-mover protection: products that naturally sell once a week are not penalized as phantom stock-outs.
5. **Top 20 Daily Shelf Inspection Prioritization**:
   - Prioritizes top 20 items requiring immediate floor attention.
   - Tie-breaking using baseline demand velocity and anomaly duration.
   - Working physical inspection audit modal.
6. **Physical Shelf Inspection Workflow**:
   - Logs recorded stock vs actual counted shelf units.
   - Shelf availability toggle (`Available` vs `Unavailable`).
   - Discrepancy root-cause classification (Phantom stock-out, Misplaced, Damaged, Theft, System lag, None).
   - Distinguishes **Suspected Anomaly** from **Verified Discrepancy**.
   - Calculates **Confirmed Financial Loss (₹)** only when verified by physical shelf evidence.
7. **Consistent Indian Rupee (INR — ₹) Financial Reporting**:
   - All monetary figures formatted using `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
   - Never fabricates missing selling prices (`Unavailable` fallback).
8. **Interactive Dashboards & Analytics**:
   - 8 primary KPI cards updated in real time.
   - Recharts visual analytics: risk distribution donut, estimated sales at risk by category, and daily revenue trends.
   - CSV export for filtered inventory, alerts, inspection records, and financial summaries.
9. **Multi-Store Location Support**:
   - Multi-branch filtering (e.g. Koramangala Superstore, Indiranagar Hypermarket, Whitefield Flagship).
10. **Configurable Settings**:
    - Adjustable risk factor weights and classification thresholds.
    - Observation window duration adjustment.

---

## 3. Technology Stack

- **Frontend Core**: React 18+ with TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS with enterprise color palettes (slate, teal, emerald, amber, rose)
- **Icons**: Lucide React
- **Data Visualization**: Recharts
- **Routing**: React Router DOM (v7)
- **Form Validation**: React Hook Form + Zod
- **CSV Processing**: Papa Parse
- **Testing**: Vitest with Node/JSDOM test runner
- **State & Persistence**: Modular TypeScript service layer + LocalStorage with in-memory session quota fallback

---

## 4. Getting Started & Installation

### Prerequisites
- Node.js `v20.18.0` or higher
- npm `10.8.0` or higher

### Installation
Clone or navigate to the repository directory and install dependencies:
```bash
cd phantom.detector
npm install
```

### Development Server
Start the local development server:
```bash
npm run dev
```
Open your browser at:
```
http://localhost:5173/
```

### Production Build
Validate TypeScript types and compile the optimized production bundle:
```bash
npm run build
```

To preview the production build locally:
```bash
npm run preview
```

### Running Automated Tests
Run the comprehensive Vitest test suite:
```bash
npm run test
```

---

## 5. Demo Credentials

For quick evaluation during the hackathon, use the 1-click demo login or sign in with:
- **Email**: `demo@phantomstock.com`
- **Password**: `Demo@1234`
- **Manager**: Rajesh Sharma
- **Supermarket Organization**: Heritage Mart - Koramangala, Bengaluru

*(Note: In accordance with security requirements, real passwords and sensitive authentication tokens are never stored in LocalStorage.)*

---

## 6. Simulated Demo Dataset

The application includes an authentic simulated supermarket dataset with **35 products across 3 Bengaluru branches**:
1. **STR_KOR_01**: Koramangala Superstore
2. **STR_IND_02**: Indiranagar Hypermarket
3. **STR_WHT_03**: Whitefield Flagship

It contains realistic Indian supermarket items (Amul Butter, Cadbury Silk, Fortune Oil, Aashirvaad Atta, Tata Tea, Parle-G, Surf Excel, Maggi, etc.) with real INR prices. It demonstrates:
- Critical phantom stock-outs (positive book stock, 0 sales, active promotion)
- Severe velocity slowdowns (>50% drop)
- Extended inactivity gaps
- Naturally slow movers (Cardamom powder, baking powder) that avoid false alarms
- Healthy high-velocity items with zero discrepancy

To load: Click **Load Simulated Demo Dataset** on Onboarding Slide 3 or in **Data Management**.

---

## 7. CSV Schema & Column Specifications

### Canonical Schema

| Column Name | Type | Required / Optional | Description |
|---|---|---|---|
| `date` | String (YYYY-MM-DD) | **Required** | Transaction or snapshot date |
| `store_id` | String | **Required** | Unique store branch identifier |
| `product_id` | String | **Required** | SKU / Barcode identifier |
| `units_sold` | Number (>= 0) | **Required** | Number of units sold today |
| `recorded_closing_stock` | Number (>= 0) | **Required** | Book inventory on hand in ERP |
| `product_name` | String | Recommended | Human-readable item name |
| `category` | String | Recommended | Department / product category |
| `selling_price` | Number (>= 0) | Recommended | Unit price in Indian Rupees (₹) |
| `store_location` | String | Optional | Store name or city |
| `average_daily_sales` | Number | Optional | Historical baseline sales/day |
| `recent_daily_sales` | Number | Optional | Sales velocity over last 3 days |
| `days_since_last_sale` | Number | Optional | Inactivity duration in days |
| `promotion_status` | Boolean | Optional | Active store promotion flag |

### Accepted Header Synonyms
The cleaning pipeline automatically normalizes common header alternatives:
- `date`: `Date`, `DATE`, `record_date`, `txn_date`, `day`
- `store_id`: `Store`, `Store ID`, `storeid`, `store_code`, `branch_id`
- `product_id`: `Product`, `Product ID`, `productid`, `item_id`, `sku`, `sku_id`
- `units_sold`: `Units Sold`, `units`, `sales`, `quantity_sold`, `sold_qty`
- `recorded_closing_stock`: `Closing Stock`, `Recorded Stock`, `stock`, `inventory`, `on_hand_stock`
- `selling_price`: `Price`, `Selling Price`, `mrp`, `unit_price`, `retail_price`
- `product_name`: `Item Name`, `name`, `description`, `item_description`

---

## 8. Explainable Risk Engine & Scoring

### Base Factor Weights (Configurable in Settings)

| Factor | Base Weight | Condition |
|---|---:|---|
| **Unexpected Zero Sales** | 30 | Positive book stock, but 0 recent sales despite expected baseline demand >= 1 unit/day |
| **Sales Velocity Drop** | 25 | Recent daily sales declined by >= 50% compared with historical daily average |
| **Stock-Demand Inconsistency** | 20 | High book stock (> 5 units), but sales checkout rate is under 25% of baseline |
| **Last-Sale Anomaly** | 15 | Days since last sale is unusually long compared to expected selling frequency |
| **Promotion Stoppage** | 10 | Actively promoted or fast-moving product abruptly stopped selling |

### Scoring Formula
$$\text{Raw Score} = \sum (\text{Factor Base Weight} \times \text{Evidence Confidence})$$
$$\text{Risk Score} = \min(100, \max(0, \text{Raw Score}))$$

### Risk Categories
- **Critical (80–100)**: Immediate shelf inspection recommended.
- **High (60–79)**: Prioritize for today's inspection rounds.
- **Medium (35–59)**: Schedule follow-up inspection.
- **Low (0–34)**: Continue routine monitoring.

---

## 9. Revenue & Financial Risk Definitions

- **Recorded POS Revenue**:
  $$\text{Revenue} = \text{Units Sold} \times \text{Selling Price}$$
- **Estimated Sales at Risk**:
  $$\text{Daily Expected Sales} = \max(\text{Historical Baseline}, 0)$$
  $$\text{Daily Sales Gap} = \max(0, \text{Daily Expected Sales} - \text{Recent Daily Sales})$$
  $$\text{Estimated Sales at Risk} = \text{Daily Sales Gap} \times \text{Anomaly Duration} \times \text{Selling Price}$$
  *(Duration is capped at `min(days_since_last_sale, observationWindowDays)`.)*
- **Confirmed Financial Loss**:
  $$\text{Loss} = \max(0, \text{Recorded Stock} - \text{Actual Shelf Count}) \times \text{Selling Price}$$
  *Calculated ONLY after a physical shelf audit verifies a genuine shortage.*

---

## 10. Data Persistence & Architecture

### LocalStorage vs Session Memory
- Non-sensitive operational state (Manager profile, Supermarket details, Settings, Inspections, Alert acknowledgments) is persisted in browser `LocalStorage`.
- If an uploaded CSV dataset exceeds browser storage quotas (typically ~5MB), the system gracefully transitions into **Safe Session Memory Mode**, retaining the full dataset in RAM and clearly displaying a non-intrusive banner.

### Modular Service Layer
- `authService.ts`: Manager registration, demo authentication, profile updates.
- `inventoryService.ts`: Cleaned inventory storage, quota safety, reports.
- `csvImportService.ts`: PapaParse wrapper, preview generation, CSV exports.
- `dataCleaningService.ts`: Column normalization, type casting, duplicate detection, quality calculation.
- `riskDetectionEngine.ts`: Explainable anomaly detection, Top 20 ranking.
- `inspectionService.ts`: Shelf inspection records, physical discrepancy reconciliation.
- `alertService.ts`: Deduplicated alert synchronization and acknowledgments.
- `analyticsService.ts`: Financial metrics, revenue trends, store comparisons.
- `currencyService.ts`: Standardized Indian Rupee formatting.

---

## 11. Backend Integration Roadmap

While this hackathon release operates client-side with a modular service layer, it is architecturally prepared for future enterprise backend integration:
- `.env.example` provides `VITE_API_BASE_URL` for REST/GraphQL endpoints.
- TypeScript interfaces in `src/types/index.ts` map 1:1 to standard backend relational schemas (PostgreSQL / TimescaleDB).
- The modular service layer can seamlessly substitute local calculations with async API calls to Python/FastAPI running scikit-learn models (such as **Isolation Forest** or **Autoencoders**) for unsupervised anomaly detection.

---

## 12. Verification & Test Checklist

- [x] Manager registration requires supermarket name and valid email.
- [x] Guided 4-step onboarding flow with backward/forward state retention.
- [x] Canonical CSV cleaning with synonym mapping and duplicate detection.
- [x] Data quality percentage computed and displayed.
- [x] File size in bytes/KB/MB is completely hidden across all UI elements.
- [x] Explainable risk engine calculates dynamic scores (0-100).
- [x] Top 20 daily prioritization ranks by risk score and breaks ties by velocity.
- [x] Physical shelf audit modal verifies genuine discrepancies and logs confirmed financial losses.
- [x] All monetary figures formatted in Indian Rupees (₹).
- [x] CSV exports for cleaned data, alerts, inspections, and financial summaries.
- [x] 18 automated Vitest unit and integration tests passing.
- [x] Clean, responsive enterprise UI with light theme and accessible controls.

---

*Developed for the AP Talent Hackathon 2026.*
