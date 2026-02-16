import { SKU, PlatformDefinition, DEFAULT_PLATFORMS, FeeChangeLog, MonthlySnapshot, AppSettings, DEFAULT_SETTINGS } from './calculations';

const SKUS_KEY = 'gleva_skus';
const PLATFORMS_KEY = 'gleva_platforms';
const ADS_KEY = 'gleva_ads_percent';
const FEE_LOG_KEY = 'gleva_fee_log';
const SNAPSHOTS_KEY = 'gleva_snapshots';
const SETTINGS_KEY = 'gleva_settings';

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

export function getSKUs(): SKU[] { return getItem(SKUS_KEY, []); }
export function saveSKUs(skus: SKU[]) { setItem(SKUS_KEY, skus); }

export function getPlatforms(): PlatformDefinition[] { return getItem(PLATFORMS_KEY, DEFAULT_PLATFORMS); }
export function savePlatforms(platforms: PlatformDefinition[]) { setItem(PLATFORMS_KEY, platforms); }

export function getGlobalAdsPercent(): number {
  if (typeof window === 'undefined') return 0;
  const data = localStorage.getItem(ADS_KEY);
  return data ? parseFloat(data) : 0;
}
export function saveGlobalAdsPercent(percent: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADS_KEY, percent.toString());
}

export function getFeeChangeLogs(): FeeChangeLog[] { return getItem(FEE_LOG_KEY, []); }
export function saveFeeChangeLogs(logs: FeeChangeLog[]) { setItem(FEE_LOG_KEY, logs); }
export function addFeeChangeLog(log: FeeChangeLog) {
  const logs = getFeeChangeLogs();
  logs.unshift(log);
  if (logs.length > 500) logs.length = 500;
  saveFeeChangeLogs(logs);
}

export function getSnapshots(): MonthlySnapshot[] { return getItem(SNAPSHOTS_KEY, []); }
export function saveSnapshots(snapshots: MonthlySnapshot[]) { setItem(SNAPSHOTS_KEY, snapshots); }
export function addSnapshot(snapshot: MonthlySnapshot) {
  const snapshots = getSnapshots();
  snapshots.unshift(snapshot);
  saveSnapshots(snapshots);
}

export function getSettings(): AppSettings { return getItem(SETTINGS_KEY, DEFAULT_SETTINGS); }
export function saveSettings(settings: AppSettings) { setItem(SETTINGS_KEY, settings); }

// CSV Export
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

// CSV Import parser
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
