// Data conversion utilities for Google Sheets ↔ App data models
import { SKU, PlatformDefinition, FeeChangeLog, MonthlySnapshot, AppSettings, DEFAULT_SETTINGS, DEFAULT_PLATFORMS } from './calculations';

// Fixed platform order for sheet columns
export const PLATFORM_IDS = [
  'amazon_fba', 'rk_world', 'blinkit', 'zepto', 'instamart',
  'firstcry', 'nykaa', 'meesho', 'myntra', 'flipkart',
];

// ==========================================
// SKU Conversion
// ==========================================

export function buildSkuHeader(): string[] {
  const base = ['id', 'name', 'sku', 'costPrice', 'gstPercent', 'weight', 'mrp', 'sellingPrice', 'notes'];
  for (const pid of PLATFORM_IDS) {
    base.push(`${pid}_mrp`, `${pid}_sp`, `${pid}_settlement`, `${pid}_returnPercent`, `${pid}_monthlyVolume`);
  }
  return base;
}

export function skuToRow(sku: SKU): (string | number)[] {
  const row: (string | number)[] = [
    sku.id, sku.name, sku.sku, sku.costPrice, sku.gstPercent,
    sku.weight, sku.mrp, sku.sellingPrice, sku.notes || '',
  ];
  for (const pid of PLATFORM_IDS) {
    const pp = sku.platformPricing[pid] || {};
    row.push(
      pp.mrp || 0,
      pp.sellingPrice || 0,
      pp.settlement !== undefined ? pp.settlement : '',
      pp.returnPercent || 0,
      pp.monthlyVolume || 0,
    );
  }
  return row;
}

export function rowToSku(row: string[]): SKU {
  const platformPricing: SKU['platformPricing'] = {};
  let col = 9; // after base columns
  for (const pid of PLATFORM_IDS) {
    const mrp = parseFloat(row[col] || '0') || 0;
    const sp = parseFloat(row[col + 1] || '0') || 0;
    const settlementStr = (row[col + 2] || '').toString().trim();
    const settlement = settlementStr !== '' ? parseFloat(settlementStr) : undefined;
    const returnPercent = parseFloat(row[col + 3] || '0') || 0;
    const monthlyVolume = parseFloat(row[col + 4] || '0') || 0;
    platformPricing[pid] = {
      mrp, sellingPrice: sp,
      ...(settlement !== undefined ? { settlement } : {}),
      returnPercent, monthlyVolume,
    };
    col += 5;
  }
  return {
    id: row[0] || '',
    name: row[1] || '',
    sku: row[2] || '',
    costPrice: parseFloat(row[3] || '0') || 0,
    gstPercent: parseFloat(row[4] || '0') || 0,
    weight: parseFloat(row[5] || '0') || 0,
    mrp: parseFloat(row[6] || '0') || 0,
    sellingPrice: parseFloat(row[7] || '0') || 0,
    notes: row[8] || '',
    platformPricing,
  };
}

// ==========================================
// Platform Conversion
// ==========================================

export function buildPlatformHeader(): string[] {
  return ['id', 'name', 'type', 'commissionPercent', 'adsPercent', 'feesExclTax'];
}

export function platformToRow(p: PlatformDefinition): (string | number)[] {
  return [
    p.id, p.name, p.type,
    p.commissionPercent !== undefined ? p.commissionPercent : '',
    p.adsPercent,
    p.feesExclTax ? 'true' : 'false',
  ];
}

export function rowToPlatform(row: string[]): PlatformDefinition {
  const p: PlatformDefinition = {
    id: row[0] || '',
    name: row[1] || '',
    type: (row[2] || 'sp_commission') as PlatformDefinition['type'],
    adsPercent: parseFloat(row[4] || '0') || 0,
  };
  const commStr = (row[3] || '').toString().trim();
  if (commStr !== '') p.commissionPercent = parseFloat(commStr);
  if (row[5] === 'true') p.feesExclTax = true;
  else if (row[5] === 'false') p.feesExclTax = false;
  return p;
}

// ==========================================
// Fee Change Log Conversion
// ==========================================

export function buildFeeLogHeader(): string[] {
  return ['id', 'platformId', 'platformName', 'field', 'oldValue', 'newValue', 'date'];
}

export function feeLogToRow(log: FeeChangeLog): (string | number)[] {
  return [log.id, log.platformId, log.platformName, log.field, log.oldValue, log.newValue, log.date];
}

export function rowToFeeLog(row: string[]): FeeChangeLog {
  return {
    id: row[0] || '',
    platformId: row[1] || '',
    platformName: row[2] || '',
    field: row[3] || '',
    oldValue: parseFloat(row[4] || '0') || 0,
    newValue: parseFloat(row[5] || '0') || 0,
    date: row[6] || '',
  };
}

// ==========================================
// Snapshot Conversion
// Uses 2 sheets: Snapshots (metadata) + SnapshotDetails (per-SKU data)
// ==========================================

export function buildSnapshotHeader(): string[] {
  return ['id', 'month', 'date', 'globalAdsPercent', 'platformDataJSON'];
}

export function buildSnapshotDetailHeader(): string[] {
  const base = ['snapshotId', 'skuId', 'skuName', 'skuCode'];
  for (const pid of PLATFORM_IDS) {
    base.push(`${pid}_profit`, `${pid}_margin`, `${pid}_volume`, `${pid}_monthlyProfit`);
  }
  return base;
}

export function snapshotToMetaRow(snap: MonthlySnapshot): (string | number)[] {
  return [
    snap.id, snap.month, snap.date, snap.globalAdsPercent,
    JSON.stringify(snap.platformData),
  ];
}

export function snapshotToDetailRows(snap: MonthlySnapshot): (string | number)[][] {
  return snap.skuResults.map(sr => {
    const row: (string | number)[] = [snap.id, sr.skuId, sr.skuName, sr.skuCode];
    for (const pid of PLATFORM_IDS) {
      const platform = sr.platforms.find(p => p.platformId === pid);
      row.push(
        platform?.profit || 0,
        platform?.margin || 0,
        platform?.volume || 0,
        platform?.monthlyProfit || 0,
      );
    }
    return row;
  });
}

export function rowsToSnapshots(
  metaRows: string[][],
  detailRows: string[][]
): MonthlySnapshot[] {
  // Skip headers
  const metas = metaRows.slice(1);
  const details = detailRows.slice(1);

  // Group details by snapshot ID
  const detailMap: Record<string, string[][]> = {};
  for (const row of details) {
    const snapId = row[0];
    if (!detailMap[snapId]) detailMap[snapId] = [];
    detailMap[snapId].push(row);
  }

  return metas.map(meta => {
    const snapId = meta[0];
    const snapDetails = detailMap[snapId] || [];

    const skuResults = snapDetails.map(dr => {
      const platforms: MonthlySnapshot['skuResults'][0]['platforms'] = [];
      let col = 4; // after snapshotId, skuId, skuName, skuCode
      for (const pid of PLATFORM_IDS) {
        platforms.push({
          platformId: pid,
          profit: parseFloat(dr[col] || '0') || 0,
          margin: parseFloat(dr[col + 1] || '0') || 0,
          volume: parseFloat(dr[col + 2] || '0') || 0,
          monthlyProfit: parseFloat(dr[col + 3] || '0') || 0,
        });
        col += 4;
      }
      return {
        skuId: dr[1] || '',
        skuName: dr[2] || '',
        skuCode: dr[3] || '',
        platforms,
      };
    });

    let platformData: MonthlySnapshot['platformData'] = {};
    try {
      platformData = JSON.parse(meta[4] || '{}');
    } catch { /* ignore */ }

    return {
      id: snapId,
      month: meta[1] || '',
      date: meta[2] || '',
      globalAdsPercent: parseFloat(meta[3] || '0') || 0,
      platformData,
      skuResults,
    };
  });
}

// ==========================================
// Settings Conversion
// ==========================================

export function buildSettingsHeader(): string[] {
  return ['minMarginAlert', 'darkMode'];
}

export function settingsToRow(s: AppSettings): (string | number)[] {
  return [s.minMarginAlert, s.darkMode ? 'true' : 'false'];
}

export function rowToSettings(row: string[]): AppSettings {
  return {
    minMarginAlert: parseFloat(row[0] || '15') || 15,
    darkMode: row[1] === 'true',
  };
}

// ==========================================
// GlobalAdsPercent Conversion
// ==========================================

export function buildAdsHeader(): string[] {
  return ['value'];
}

// ==========================================
// Full sync response type
// ==========================================

export interface SyncData {
  skus: SKU[];
  platforms: PlatformDefinition[];
  globalAdsPercent: number;
  feeChangeLogs: FeeChangeLog[];
  snapshots: MonthlySnapshot[];
  settings: AppSettings;
}
