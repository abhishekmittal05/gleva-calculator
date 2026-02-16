import { SKU, PlatformDefinition, DEFAULT_PLATFORMS, FeeChangeLog, MonthlySnapshot, AppSettings, DEFAULT_SETTINGS } from './calculations';
import type { SyncData } from './sync';

const SKUS_KEY = 'gleva_skus';
const PLATFORMS_KEY = 'gleva_platforms';
const ADS_KEY = 'gleva_ads_percent';
const FEE_LOG_KEY = 'gleva_fee_log';
const SNAPSHOTS_KEY = 'gleva_snapshots';
const SETTINGS_KEY = 'gleva_settings';

// ==========================================
// LocalStorage helpers (unchanged)
// ==========================================

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const data = localStorage.getItem(key);
  if (!data) return fallback;
  try { return JSON.parse(data); } catch { return fallback; }
}

function setItem(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ==========================================
// Debounced sync to Google Sheets (fire-and-forget)
// ==========================================

const syncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function syncToSheets(endpoint: string, data: unknown, method: 'PUT' | 'POST' = 'PUT') {
  if (typeof window === 'undefined') return;

  // Debounce by 2 seconds to batch rapid changes
  if (syncTimers[endpoint]) clearTimeout(syncTimers[endpoint]);
  syncTimers[endpoint] = setTimeout(async () => {
    try {
      await fetch(`/api/sheets/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      console.warn(`Sheets sync failed for ${endpoint}`);
    }
  }, 2000);
}

// ==========================================
// Pull all data from Google Sheets → localStorage
// Called on app load to ensure new browsers get data
// ==========================================

export async function pullFromSheets(): Promise<SyncData | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch('/api/sheets/sync');
    if (!response.ok) return null;
    const data: SyncData = await response.json();

    // Update localStorage with Sheets data
    if (data.skus) setItem(SKUS_KEY, data.skus);
    if (data.platforms && data.platforms.length > 0) setItem(PLATFORMS_KEY, data.platforms);
    if (data.feeChangeLogs) setItem(FEE_LOG_KEY, data.feeChangeLogs);
    if (data.snapshots) setItem(SNAPSHOTS_KEY, data.snapshots);
    if (data.settings) setItem(SETTINGS_KEY, data.settings);
    if (data.globalAdsPercent !== undefined) {
      localStorage.setItem(ADS_KEY, data.globalAdsPercent.toString());
    }

    return data;
  } catch {
    console.warn('Sheets sync failed, using local data');
    return null;
  }
}

// ==========================================
// SKU storage + sync
// ==========================================

export function getSKUs(): SKU[] { return getItem(SKUS_KEY, []); }
export function saveSKUs(skus: SKU[]) {
  setItem(SKUS_KEY, skus);
  syncToSheets('skus', skus);
}

// ==========================================
// Platform storage + sync
// ==========================================

export function getPlatforms(): PlatformDefinition[] { return getItem(PLATFORMS_KEY, DEFAULT_PLATFORMS); }
export function savePlatforms(platforms: PlatformDefinition[]) {
  setItem(PLATFORMS_KEY, platforms);
  syncToSheets('platforms', platforms);
}

// ==========================================
// Global Ads Percent storage + sync
// ==========================================

export function getGlobalAdsPercent(): number {
  if (typeof window === 'undefined') return 0;
  const data = localStorage.getItem(ADS_KEY);
  return data ? parseFloat(data) : 0;
}
export function saveGlobalAdsPercent(percent: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADS_KEY, percent.toString());
  syncToSheets('ads-percent', { value: percent });
}

// ==========================================
// Fee Change Log storage + sync
// ==========================================

export function getFeeChangeLogs(): FeeChangeLog[] { return getItem(FEE_LOG_KEY, []); }
export function saveFeeChangeLogs(logs: FeeChangeLog[]) {
  setItem(FEE_LOG_KEY, logs);
  syncToSheets('fee-logs', logs);
}
export function addFeeChangeLog(log: FeeChangeLog) {
  const logs = getFeeChangeLogs();
  logs.unshift(log);
  if (logs.length > 500) logs.length = 500;
  saveFeeChangeLogs(logs);
}

// ==========================================
// Snapshot storage + sync
// ==========================================

export function getSnapshots(): MonthlySnapshot[] { return getItem(SNAPSHOTS_KEY, []); }
export function saveSnapshots(snapshots: MonthlySnapshot[]) {
  setItem(SNAPSHOTS_KEY, snapshots);
  syncToSheets('snapshots', snapshots);
}
export function addSnapshot(snapshot: MonthlySnapshot) {
  const snapshots = getSnapshots();
  snapshots.unshift(snapshot);
  saveSnapshots(snapshots);
}

// ==========================================
// Settings storage + sync
// ==========================================

export function getSettings(): AppSettings { return getItem(SETTINGS_KEY, DEFAULT_SETTINGS); }
export function saveSettings(settings: AppSettings) {
  setItem(SETTINGS_KEY, settings);
  syncToSheets('settings', settings);
}

// ==========================================
// CSV utilities (unchanged)
// ==========================================

export function exportToCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  rows.forEach(row => lines.push(row.map(escape).join(',')));
  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(current.trim()); current = ''; }
        else current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}
