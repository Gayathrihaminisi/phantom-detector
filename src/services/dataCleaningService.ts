import {
  RawCSVRecord,
  CleanedInventoryRecord,
  ValidationError,
  DataCleaningReport,
  ImportMode,
  ColumnMappingInfo,
  ColumnMappingDetectionResult,
  CleaningActionAudit,
} from '../types';

// Canonical field definitions
export const REQUIRED_CANONICAL_COLUMNS = [
  'date',
  'store_id',
  'product_id',
  'units_sold',
  'recorded_closing_stock',
] as const;

export const OPTIONAL_CANONICAL_COLUMNS = [
  'product_name',
  'category',
  'selling_price',
  'store_location',
  'average_daily_sales',
  'recent_daily_sales',
  'days_since_last_sale',
  'promotion_status',
  'replenishment_date',
  'replenishment_quantity',
] as const;

export const COLUMN_DESCRIPTIONS: Record<
  string,
  { label: string; description: string; impactIfMissing?: string }
> = {
  date: {
    label: 'Date',
    description: 'Transaction or daily snapshot date (YYYY-MM-DD or DD-MM-YYYY)',
    impactIfMissing: 'Required. Inventory transactions cannot be tracked without a date.',
  },
  store_id: {
    label: 'Store ID',
    description: 'Unique store branch or supermarket location identifier',
    impactIfMissing: 'Required. Cannot attribute inventory to the correct supermarket location.',
  },
  product_id: {
    label: 'Product ID / SKU',
    description: 'Unique barcode, item code, or SKU identifier',
    impactIfMissing: 'Required. Shelf stock-outs cannot be identified without a unique product ID.',
  },
  units_sold: {
    label: 'Units Sold',
    description: 'Sales quantity sold at cash registers today',
    impactIfMissing: 'Required. Sales velocity and stock-out drop signals cannot be evaluated.',
  },
  recorded_closing_stock: {
    label: 'Recorded Closing Stock',
    description: 'Book inventory on hand in the ERP or store database',
    impactIfMissing: 'Required. Discrepancies between book stock and physical shelf cannot be checked.',
  },
  product_name: {
    label: 'Product Name',
    description: 'Readable product title and packaging description',
    impactIfMissing: 'Product ID will be used in place of name in tables and inspection lists.',
  },
  category: {
    label: 'Category',
    description: 'Department (e.g. Dairy, Snacks, Staples, Personal Care)',
    impactIfMissing: 'Defaults to "General Merchandise" for risk categorizations.',
  },
  selling_price: {
    label: 'Selling Price (₹)',
    description: 'Unit retail selling price in Indian Rupees (₹)',
    impactIfMissing: 'Revenue and Estimated Sales at Risk (₹) cannot be calculated. Displayed as "Unavailable".',
  },
  store_location: {
    label: 'Store Location',
    description: 'Store branch city, address, or neighborhood name',
    impactIfMissing: 'Store branch ID will be used as the location label.',
  },
  average_daily_sales: {
    label: 'Average Daily Sales',
    description: 'Historical expected sales baseline (units per day)',
    impactIfMissing: 'Will be automatically inferred from historical daily sales in the uploaded data.',
  },
  recent_daily_sales: {
    label: 'Recent Daily Sales',
    description: 'Recent checkout velocity (e.g. 3-day average)',
    impactIfMissing: 'Defaults to current daily units sold.',
  },
  days_since_last_sale: {
    label: 'Days Since Last Sale',
    description: 'Consecutive days without sales activity for this product',
    impactIfMissing: 'Estimated from whether units sold is zero (1 day) or positive (0 days).',
  },
  promotion_status: {
    label: 'Promotion Status',
    description: 'Active discount or prominent aisle display flag',
    impactIfMissing: 'Promotion stoppage risk factor will not trigger without promotion data.',
  },
};

// Header synonym normalization map
const HEADER_SYNONYMS: Record<string, string> = {
  // date
  date: 'date',
  record_date: 'date',
  txn_date: 'date',
  day: 'date',
  transaction_date: 'date',
  sales_date: 'date',

  // store_id
  store: 'store_id',
  store_id: 'store_id',
  storeid: 'store_id',
  store_code: 'store_id',
  branch_id: 'store_id',
  branch: 'store_id',
  store_no: 'store_id',

  // product_id
  product: 'product_id',
  product_id: 'product_id',
  productid: 'product_id',
  item_id: 'product_id',
  itemid: 'product_id',
  sku: 'product_id',
  sku_id: 'product_id',
  barcode: 'product_id',
  article_no: 'product_id',

  // units_sold
  units_sold: 'units_sold',
  unitssold: 'units_sold',
  units: 'units_sold',
  sales: 'units_sold',
  quantity_sold: 'units_sold',
  qty_sold: 'units_sold',
  units_sold_today: 'units_sold',
  sold_qty: 'units_sold',
  volume: 'units_sold',

  // recorded_closing_stock
  recorded_closing_stock: 'recorded_closing_stock',
  recordedclosingstock: 'recorded_closing_stock',
  closing_stock: 'recorded_closing_stock',
  closingstock: 'recorded_closing_stock',
  recorded_stock: 'recorded_closing_stock',
  recordedstock: 'recorded_closing_stock',
  stock: 'recorded_closing_stock',
  inventory: 'recorded_closing_stock',
  on_hand_stock: 'recorded_closing_stock',
  onhand_stock: 'recorded_closing_stock',
  current_stock: 'recorded_closing_stock',
  book_stock: 'recorded_closing_stock',

  // product_name
  product_name: 'product_name',
  productname: 'product_name',
  item_name: 'product_name',
  itemname: 'product_name',
  name: 'product_name',
  description: 'product_name',
  item_description: 'product_name',
  product_title: 'product_name',

  // category
  category: 'category',
  dept: 'category',
  department: 'category',
  section: 'category',
  product_category: 'category',
  item_group: 'category',

  // selling_price
  selling_price: 'selling_price',
  sellingprice: 'selling_price',
  sellingpriceinr: 'selling_price',
  price: 'selling_price',
  priceinr: 'selling_price',
  pricers: 'selling_price',
  mrp: 'selling_price',
  mrpinr: 'selling_price',
  mrprs: 'selling_price',
  unit_price: 'selling_price',
  unitprice: 'selling_price',
  rate: 'selling_price',
  unitrate: 'selling_price',
  rateunit: 'selling_price',
  retail_price: 'selling_price',
  salesprice: 'selling_price',
  itemprice: 'selling_price',

  // store_location
  store_location: 'store_location',
  storelocation: 'store_location',
  location: 'store_location',
  store_name: 'store_location',
  city: 'store_location',
  branch_name: 'store_location',

  // average_daily_sales
  average_daily_sales: 'average_daily_sales',
  averagedailysales: 'average_daily_sales',
  avg_daily_sales: 'average_daily_sales',
  historical_daily_sales: 'average_daily_sales',
  baseline_sales: 'average_daily_sales',
  expected_sales: 'average_daily_sales',
  daily_baseline: 'average_daily_sales',

  // recent_daily_sales
  recent_daily_sales: 'recent_daily_sales',
  recentdailysales: 'recent_daily_sales',
  recent_sales: 'recent_daily_sales',
  last_3_days_avg_sales: 'recent_daily_sales',
  recent_avg_sales: 'recent_daily_sales',

  // days_since_last_sale
  days_since_last_sale: 'days_since_last_sale',
  dayssincelastsale: 'days_since_last_sale',
  days_no_sale: 'days_since_last_sale',
  days_inactive: 'days_since_last_sale',
  days_without_sale: 'days_since_last_sale',

  // promotion_status
  promotion_status: 'promotion_status',
  promotionstatus: 'promotion_status',
  promotion: 'promotion_status',
  promo: 'promotion_status',
  is_promoted: 'promotion_status',
  on_sale: 'promotion_status',

  // replenishment_date
  replenishment_date: 'replenishment_date',
  restock_date: 'replenishment_date',

  // replenishment_quantity
  replenishment_quantity: 'replenishment_quantity',
  restock_quantity: 'replenishment_quantity',
  restock_qty: 'replenishment_quantity',
};

/**
 * Normalizes header string to canonical name if recognized.
 * Handles spaces, underscores, hyphens, and camelCase.
 */
export function normalizeHeader(rawHeader: string): string {
  if (!rawHeader) return '';
  const trimmed = rawHeader.trim();
  // Split camelCase (e.g. productId -> product_id, recordedStock -> recorded_stock)
  const decamel = trimmed.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  const cleaned = decamel
    .toLowerCase()
    .replace(/[\s\-_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return HEADER_SYNONYMS[cleaned] || cleaned;
}

/**
 * Validates date string in YYYY-MM-DD or common formats
 */
export function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Standard YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (year >= 2000 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return trimmed;
    }
  }

  // Common DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10).toString().padStart(2, '0');
    const month = parseInt(dmyMatch[2], 10).toString().padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // MM/DD/YYYY format
  const mdyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (mdyMatch) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  // Attempt JavaScript Date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

export interface CleaningResult {
  cleanedRecords: CleanedInventoryRecord[];
  errors: ValidationError[];
  report: DataCleaningReport;
  rawHeaderMapping: Record<string, string>;
  mappingResult: ColumnMappingDetectionResult;
}

export class DataCleaningService {
  /**
   * Detects and maps CSV column headers automatically with confidence scores
   */
  public static detectColumnMappings(headers: string[]): ColumnMappingDetectionResult {
    const mappings: ColumnMappingInfo[] = [];
    const rawHeaderMap: Record<string, string> = {};
    const mappedCanonical = new Set<string>();
    const unmappedHeaders: string[] = [];

    headers.forEach((h) => {
      const canonical = normalizeHeader(h);
      const isRequired = (REQUIRED_CANONICAL_COLUMNS as readonly string[]).includes(canonical);
      const isOptional = (OPTIONAL_CANONICAL_COLUMNS as readonly string[]).includes(canonical);

      if (isRequired || isOptional) {
        rawHeaderMap[h] = canonical;
        mappedCanonical.add(canonical);
        mappings.push({
          rawHeader: h,
          canonicalField: canonical,
          confidence: 'high',
          isRequired,
          isOptional,
          description: COLUMN_DESCRIPTIONS[canonical]?.description || canonical,
        });
      } else {
        rawHeaderMap[h] = '';
        unmappedHeaders.push(h);
        mappings.push({
          rawHeader: h,
          canonicalField: '',
          confidence: 'unmapped',
          isRequired: false,
          isOptional: false,
          description: 'Unrecognized column. Select a mapping or leave unmapped.',
        });
      }
    });

    const missingRequired = (REQUIRED_CANONICAL_COLUMNS as readonly string[]).filter(
      (col) => !mappedCanonical.has(col)
    );

    const missingOptional = (OPTIONAL_CANONICAL_COLUMNS as readonly string[]).filter(
      (col) => !mappedCanonical.has(col)
    );

    const impactExplanations: Record<string, string> = {};
    missingRequired.forEach((col) => {
      impactExplanations[col] =
        COLUMN_DESCRIPTIONS[col]?.impactIfMissing || 'Essential column required for inventory analysis.';
    });
    missingOptional.forEach((col) => {
      if (COLUMN_DESCRIPTIONS[col]?.impactIfMissing) {
        impactExplanations[col] = COLUMN_DESCRIPTIONS[col].impactIfMissing!;
      }
    });

    return {
      mappings,
      rawHeaderMap,
      missingRequired,
      missingOptional,
      unmappedHeaders,
      impactExplanations,
      canProceed: missingRequired.length === 0,
    };
  }

  /**
   * Main pipeline for cleaning and validating raw CSV records
   */
  public static cleanDataset(
    rawRows: RawCSVRecord[],
    supermarketName: string,
    importMode: ImportMode = 'replace',
    existingRecords: CleanedInventoryRecord[] = [],
    customHeaderMapping?: Record<string, string>
  ): CleaningResult {
    const errors: ValidationError[] = [];
    const cleaningSteps: string[] = [];
    const actionsAudit: CleaningActionAudit[] = [];

    // Step 1: Normalize headers
    cleaningSteps.push('Normalized column headers and matched against canonical retail schema');

    if (rawRows.length === 0) {
      const mappingResult = this.detectColumnMappings([]);
      return {
        cleanedRecords: [],
        errors: [
          {
            rowIndex: 0,
            rawRow: {},
            errorMessage: 'The uploaded CSV file is empty. Please choose a CSV file with inventory data.',
            severity: 'error',
          },
        ],
        report: {
          totalRowsReceived: 0,
          validAcceptedRecords: 0,
          recordsCorrected: 0,
          duplicateRecordsIdentified: 0,
          invalidRecordsRejected: 0,
          missingValueWarnings: 0,
          cleaningStepsCompleted: ['CSV is empty'],
          dataQualityPercentage: 0,
          requiresReview: true,
          importTimestamp: new Date().toISOString(),
          supermarketName,
          importMode,
          actionsAudit: [],
          unmappedColumns: [],
          missingOptionalColumns: [...OPTIONAL_CANONICAL_COLUMNS],
        },
        rawHeaderMapping: {},
        mappingResult,
      };
    }

    const firstRowKeys = Object.keys(rawRows[0]);
    const mappingResult = this.detectColumnMappings(firstRowKeys);

    // Apply custom mapping override if provided by manager
    const rawHeaderMapping: Record<string, string> = customHeaderMapping
      ? { ...mappingResult.rawHeaderMap, ...customHeaderMapping }
      : { ...mappingResult.rawHeaderMap };

    // Check required columns present
    const mappedCanonicalValues = new Set(
      Object.values(rawHeaderMapping).filter((v) => Boolean(v))
    );
    const missingRequired = (REQUIRED_CANONICAL_COLUMNS as readonly string[]).filter(
      (col) => !mappedCanonicalValues.has(col)
    );

    if (missingRequired.length > 0) {
      errors.push({
        rowIndex: 0,
        rawRow: rawRows[0] || {},
        errorMessage: `Missing required column(s): ${missingRequired.join(', ')}. Please map these columns to proceed.`,
        severity: 'error',
      });
    }

    cleaningSteps.push(
      'Validated minimum required columns: date, store_id, product_id, units_sold, recorded_closing_stock'
    );

    let recordsCorrectedCount = 0;
    let missingValueWarningsCount = 0;
    let duplicateRecordsIdentifiedCount = 0;

    const validRows: CleanedInventoryRecord[] = [];
    const seenExactKeys = new Set<string>();
    const seenCompositeKeys = new Map<string, number>(); // key -> row index

    cleaningSteps.push('Sanitizing data types, trimming whitespace, and verifying numeric boundaries');

    // Process row by row
    rawRows.forEach((row, idx) => {
      const rowIndex = idx + 1; // 1-based row number

      // Skip completely empty lines
      const values = Object.values(row).map((v) => (v ?? '').trim());
      if (values.every((v) => v === '')) {
        return;
      }

      // Map raw row fields to canonical dictionary
      const canonicalRow: Record<string, string> = {};
      Object.entries(row).forEach(([key, val]) => {
        const canonicalKey = rawHeaderMapping[key] || normalizeHeader(key);
        if (canonicalKey) {
          const rawVal = val !== undefined && val !== null ? String(val) : '';
          const trimmedVal = rawVal.trim();
          if (rawVal !== trimmedVal) {
            actionsAudit.push({
              id: `audit_trim_${rowIndex}_${canonicalKey}`,
              rowIndex,
              fieldName: canonicalKey,
              action: 'trimmed_whitespace',
              originalValue: rawVal,
              correctedValue: trimmedVal,
              description: `Trimmed extra whitespace from ${canonicalKey}`,
            });
          }
          canonicalRow[canonicalKey] = trimmedVal;
        }
      });

      let rowHasFatalError = false;
      let rowWasCorrected = false;

      // 1. Validate date
      const rawDate = canonicalRow['date'];
      if (!rawDate || rawDate === '') {
        errors.push({
          rowIndex,
          rawRow: row,
          fieldName: 'date',
          errorMessage: `Row ${rowIndex}: Date is missing. Please provide a transaction date.`,
          severity: 'error',
        });
        rowHasFatalError = true;
      } else {
        const parsedDate = parseDateString(rawDate);
        if (!parsedDate) {
          errors.push({
            rowIndex,
            rawRow: row,
            fieldName: 'date',
            errorMessage: `Row ${rowIndex}: Date "${rawDate}" could not be recognized. Expected format is YYYY-MM-DD or DD-MM-YYYY.`,
            severity: 'error',
          });
          rowHasFatalError = true;
        } else if (parsedDate !== rawDate) {
          rowWasCorrected = true;
          actionsAudit.push({
            id: `audit_date_${rowIndex}`,
            rowIndex,
            fieldName: 'date',
            action: 'date_normalized',
            originalValue: rawDate,
            correctedValue: parsedDate,
            description: `Standardized date format from "${rawDate}" to "${parsedDate}"`,
          });
          canonicalRow['date'] = parsedDate;
        }
      }

      // 2. Validate store_id
      const storeId = canonicalRow['store_id'];
      if (!storeId || storeId === '') {
        errors.push({
          rowIndex,
          rawRow: row,
          fieldName: 'store_id',
          errorMessage: `Row ${rowIndex}: Store ID is missing. Store ID is needed to associate inventory with your branch.`,
          severity: 'error',
        });
        rowHasFatalError = true;
      }

      // 3. Validate product_id
      const productId = canonicalRow['product_id'];
      if (!productId || productId === '') {
        errors.push({
          rowIndex,
          rawRow: row,
          fieldName: 'product_id',
          errorMessage: `Row ${rowIndex}: Some product IDs are missing. Product ID is required to identify the item.`,
          severity: 'error',
        });
        rowHasFatalError = true;
      }

      // 4. Validate units_sold
      // Requirement: Do not automatically replace missing sales with zero unless confirmed!
      const rawUnitsSold = canonicalRow['units_sold'];
      let unitsSoldNum = NaN;
      if (rawUnitsSold === undefined || rawUnitsSold === '') {
        errors.push({
          rowIndex,
          rawRow: row,
          fieldName: 'units_sold',
          errorMessage: `Row ${rowIndex}: Units sold is missing. A recorded checkout value (0 or positive) must be provided.`,
          severity: 'error',
        });
        rowHasFatalError = true;
      } else {
        unitsSoldNum = Number(rawUnitsSold);
        if (isNaN(unitsSoldNum)) {
          errors.push({
            rowIndex,
            rawRow: row,
            fieldName: 'units_sold',
            errorMessage: `Row ${rowIndex}: This row contains text ("${rawUnitsSold}") where a number is expected in units sold.`,
            severity: 'error',
          });
          rowHasFatalError = true;
        } else if (unitsSoldNum < 0) {
          errors.push({
            rowIndex,
            rawRow: row,
            fieldName: 'units_sold',
            errorMessage: `Row ${rowIndex}: Negative units_sold (${unitsSoldNum}) is invalid. Quantities cannot be less than zero.`,
            severity: 'error',
          });
          rowHasFatalError = true;
        }
      }

      // 5. Validate recorded_closing_stock
      const rawStock = canonicalRow['recorded_closing_stock'];
      let stockNum = NaN;
      if (rawStock === undefined || rawStock === '') {
        errors.push({
          rowIndex,
          rawRow: row,
          fieldName: 'recorded_closing_stock',
          errorMessage: `Row ${rowIndex}: Closing stock is missing. A recorded quantity must be provided.`,
          severity: 'error',
        });
        rowHasFatalError = true;
      } else {
        stockNum = Number(rawStock);
        if (isNaN(stockNum)) {
          errors.push({
            rowIndex,
            rawRow: row,
            fieldName: 'recorded_closing_stock',
            errorMessage: `Row ${rowIndex}: This row contains text ("${rawStock}") where a number is expected in closing stock.`,
            severity: 'error',
          });
          rowHasFatalError = true;
        } else if (stockNum < 0) {
          errors.push({
            rowIndex,
            rawRow: row,
            fieldName: 'recorded_closing_stock',
            errorMessage: `Row ${rowIndex}: Negative recorded_closing_stock (${stockNum}) is invalid. Stock on hand cannot be less than zero.`,
            severity: 'error',
          });
          rowHasFatalError = true;
        }
      }

      // 6. Validate selling_price (optional/recommended)
      let sellingPriceNum: number | null = null;
      const rawPrice = canonicalRow['selling_price'];
      if (rawPrice !== undefined && rawPrice !== null && String(rawPrice).trim() !== '') {
        // Sanitize currency symbols (₹, Rs, Rs., $, commas, etc.)
        const cleanedPriceStr = String(rawPrice)
          .replace(/[\u20B9$€£]/g, '') // remove currency symbols including ₹
          .replace(/\b(rs\.?|inr)\b/gi, '') // remove Rs, Rs., INR
          .replace(/,/g, '') // remove commas
          .trim();

        const p = Number(cleanedPriceStr);
        if (isNaN(p) || p < 0) {
          errors.push({
            rowIndex,
            rawRow: row,
            fieldName: 'selling_price',
            errorMessage: `Row ${rowIndex}: Selling price "${rawPrice}" is invalid. Selling price is missing or invalid, so revenue cannot be calculated for this record.`,
            severity: 'warning',
          });
          missingValueWarningsCount++;
        } else {
          sellingPriceNum = p;
        }
      } else {
        errors.push({
          rowIndex,
          rawRow: row,
          fieldName: 'selling_price',
          errorMessage: `Row ${rowIndex}: Selling price is missing, so revenue cannot be calculated for this record.`,
          severity: 'warning',
        });
        missingValueWarningsCount++;
      }

      // If fatal error, reject this row (do not silently delete or corrupt dataset)
      if (rowHasFatalError) {
        return;
      }

      // Duplicate Check 1: Exact duplicate row
      const exactKey = JSON.stringify(canonicalRow);
      if (seenExactKeys.has(exactKey)) {
        duplicateRecordsIdentifiedCount++;
        errors.push({
          rowIndex,
          rawRow: row,
          errorMessage: `Row ${rowIndex}: Some records may be duplicates. Exact duplicate row detected and skipped to prevent duplicate counting.`,
          severity: 'warning',
        });
        return;
      }
      seenExactKeys.add(exactKey);

      // Duplicate Check 2: Potential duplicate for date + store_id + product_id
      const parsedDate = canonicalRow['date'];
      const compositeKey = `${parsedDate}_${storeId}_${productId}`;
      if (seenCompositeKeys.has(compositeKey)) {
        duplicateRecordsIdentifiedCount++;
        const prevRowIndex = seenCompositeKeys.get(compositeKey);
        errors.push({
          rowIndex,
          rawRow: row,
          errorMessage: `Row ${rowIndex}: Some records may be duplicates. Record for product "${productId}" at store "${storeId}" on ${parsedDate} was already seen at line ${prevRowIndex}. Keeping latest valid record.`,
          severity: 'warning',
        });
        // Remove earlier record so the latest valid takes precedence
        const existingIdx = validRows.findIndex(
          (r) => r.date === parsedDate && r.store_id === storeId && r.product_id === productId
        );
        if (existingIdx >= 0) {
          validRows.splice(existingIdx, 1);
        }
      }
      seenCompositeKeys.set(compositeKey, rowIndex);

      // Cleaned values & sensible fallbacks
      const productName = canonicalRow['product_name'] || `Product ${productId}`;
      const category = canonicalRow['category'] || 'General Merchandise';
      const storeLocation = canonicalRow['store_location'] || 'Supermarket Store';

      // Parse average daily sales if provided, or mark for baseline inference
      let avgDailySales =
        canonicalRow['average_daily_sales'] !== undefined && canonicalRow['average_daily_sales'] !== ''
          ? Math.max(0, Number(canonicalRow['average_daily_sales']) || 0)
          : -1;

      let recentDailySales =
        canonicalRow['recent_daily_sales'] !== undefined && canonicalRow['recent_daily_sales'] !== ''
          ? Math.max(0, Number(canonicalRow['recent_daily_sales']) || 0)
          : unitsSoldNum;

      let daysSinceLastSale =
        canonicalRow['days_since_last_sale'] !== undefined && canonicalRow['days_since_last_sale'] !== ''
          ? Math.max(0, Number(canonicalRow['days_since_last_sale']) || 0)
          : unitsSoldNum === 0
          ? 1
          : 0;

      // Promotion status
      const promoRaw = (canonicalRow['promotion_status'] || '').toLowerCase();
      const promotionStatus =
        promoRaw === 'true' || promoRaw === '1' || promoRaw === 'yes' || promoRaw === 'y';

      if (rowWasCorrected) {
        recordsCorrectedCount++;
      }

      const cleanedItem: CleanedInventoryRecord = {
        id: `rec_${parsedDate}_${storeId}_${productId}_${rowIndex}`,
        date: parsedDate,
        store_id: storeId,
        store_location: storeLocation,
        product_id: productId,
        product_name: productName,
        category,
        units_sold: unitsSoldNum,
        recorded_closing_stock: stockNum,
        selling_price: sellingPriceNum,
        average_daily_sales: avgDailySales,
        recent_daily_sales: recentDailySales,
        days_since_last_sale: daysSinceLastSale,
        promotion_status: promotionStatus,
        replenishment_date: canonicalRow['replenishment_date'] || undefined,
        replenishment_quantity: canonicalRow['replenishment_quantity']
          ? Number(canonicalRow['replenishment_quantity'])
          : undefined,
      };

      validRows.push(cleanedItem);
    });

    cleaningSteps.push(
      'Executed exact duplicate and composite-key (date + store_id + product_id) deduplication'
    );

    // Step 4: Baseline Inferences for records missing average_daily_sales
    cleaningSteps.push('Computed baseline daily sales and sales gaps from transaction history');
    const productSalesMap = new Map<string, number[]>();
    validRows.forEach((item) => {
      const key = `${item.store_id}_${item.product_id}`;
      if (!productSalesMap.has(key)) {
        productSalesMap.set(key, []);
      }
      productSalesMap.get(key)!.push(item.units_sold);
    });

    validRows.forEach((item) => {
      if (item.average_daily_sales < 0) {
        const key = `${item.store_id}_${item.product_id}`;
        const salesList = productSalesMap.get(key) || [];
        if (salesList.length > 0) {
          const sum = salesList.reduce((acc, curr) => acc + curr, 0);
          item.average_daily_sales = parseFloat((sum / salesList.length).toFixed(2));
          item.is_inferred_baseline = true;
          actionsAudit.push({
            id: `audit_baseline_${item.id}`,
            rowIndex: 0,
            fieldName: 'average_daily_sales',
            action: 'baseline_inferred',
            originalValue: 'missing',
            correctedValue: item.average_daily_sales.toString(),
            description: `Inferred average daily sales of ${item.average_daily_sales} units/day from product history`,
          });
        } else {
          item.average_daily_sales = item.units_sold;
        }
      }
    });

    // Step 5: Merge or Append handling with existing records if applicable
    let finalRecords = validRows;
    if (importMode === 'append' && existingRecords.length > 0) {
      cleaningSteps.push('Appended newly validated rows to existing store inventory');
      finalRecords = [...existingRecords, ...validRows];
    } else if (importMode === 'merge' && existingRecords.length > 0) {
      cleaningSteps.push('Merged and updated records with existing inventory using date+store+SKU');
      const recordMap = new Map<string, CleanedInventoryRecord>();
      existingRecords.forEach((r) => {
        recordMap.set(`${r.date}_${r.store_id}_${r.product_id}`, r);
      });
      validRows.forEach((r) => {
        recordMap.set(`${r.date}_${r.store_id}_${r.product_id}`, r);
      });
      finalRecords = Array.from(recordMap.values());
    } else {
      cleaningSteps.push('Replaced existing dataset with newly validated records');
    }

    // Step 6: Data quality percentage
    const totalNonEmptyRows = rawRows.filter((r) =>
      Object.values(r).some((v) => (v ?? '').trim() !== '')
    ).length;

    const validCount = validRows.length;
    const invalidCount = totalNonEmptyRows - validCount;

    const dataQuality =
      totalNonEmptyRows > 0
        ? parseFloat(((validCount / totalNonEmptyRows) * 100).toFixed(1))
        : 0;

    const requiresReview = dataQuality < 80.0 || (invalidCount / (totalNonEmptyRows || 1)) > 0.2;

    const report: DataCleaningReport = {
      totalRowsReceived: totalNonEmptyRows,
      validAcceptedRecords: validCount,
      recordsCorrected: recordsCorrectedCount,
      duplicateRecordsIdentified: duplicateRecordsIdentifiedCount,
      invalidRecordsRejected: invalidCount,
      missingValueWarnings: missingValueWarningsCount,
      cleaningStepsCompleted: cleaningSteps,
      dataQualityPercentage: dataQuality,
      requiresReview,
      importTimestamp: new Date().toISOString(),
      supermarketName,
      importMode,
      actionsAudit,
      unmappedColumns: mappingResult.unmappedHeaders,
      missingOptionalColumns: mappingResult.missingOptional,
    };

    return {
      cleanedRecords: finalRecords,
      errors,
      report,
      rawHeaderMapping,
      mappingResult,
    };
  }

  /**
   * Generates downloadable CSV string from validation errors
   */
  public static generateErrorReportCSV(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return 'row_index,severity,field_name,error_message\n0,info,none,No errors found in dataset';
    }

    const headers = ['row_index', 'severity', 'field_name', 'error_message'];
    const lines = [headers.join(',')];

    errors.forEach((err) => {
      const field = err.fieldName ? `"${err.fieldName.replace(/"/g, '""')}"` : '""';
      const msg = `"${err.errorMessage.replace(/"/g, '""')}"`;
      lines.push(`${err.rowIndex},${err.severity},${field},${msg}`);
    });

    return lines.join('\n');
  }

  /**
   * Generates downloadable sample template CSV with canonical headers
   */
  public static generateSampleCSVTemplate(): string {
    const headers = [
      'date',
      'store_id',
      'store_location',
      'product_id',
      'product_name',
      'category',
      'units_sold',
      'recorded_closing_stock',
      'selling_price',
      'average_daily_sales',
      'recent_daily_sales',
      'days_since_last_sale',
      'promotion_status',
    ];

    const sampleRows = [
      '2026-10-14,STR_001,Koramangala Supermart,PRD_101,Amul Butter 500g,Dairy,0,18,275.00,8.5,0,3,true',
      '2026-10-14,STR_001,Koramangala Supermart,PRD_102,Tata Tea Premium 500g,Beverages,1,24,320.00,7.0,0.5,4,false',
      '2026-10-14,STR_001,Koramangala Supermart,PRD_103,Aashirvaad Atta 5kg,Staples,14,35,310.00,12.0,14,0,false',
      '2026-10-14,STR_002,Indiranagar Store,PRD_104,Parle-G Gold 1kg,Snacks,0,22,120.00,11.0,0,5,true',
      '2026-10-14,STR_002,Indiranagar Store,PRD_105,Dettol Liquid 500ml,Personal Care,0,15,190.00,6.0,0,4,false',
      '2026-10-14,STR_001,Koramangala Supermart,PRD_106,Maggi 2-Min Noodles 560g,Snacks,18,40,115.00,16.0,18,0,false',
    ];

    return [headers.join(','), ...sampleRows].join('\n');
  }
}
