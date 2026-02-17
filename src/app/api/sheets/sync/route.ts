import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/sheets';
import {
  rowToSku, rowToPlatform, rowToFeeLog, rowsToSnapshots,
  rowToSettings,
} from '@/lib/sync';
import { DEFAULT_PLATFORMS, DEFAULT_SETTINGS } from '@/lib/calculations';
import type { SyncData } from '@/lib/sync';

const SHEET_NAMES = ['SKUs', 'Platforms', 'FeeChangeLogs', 'Snapshots', 'SnapshotDetails', 'Settings', 'GlobalAdsPercent'];

// GET: Read ALL data from Google Sheets in a single API call
export async function GET() {
  try {
    // Read sheets one by one to identify which fails
    const results: Record<string, string[][]> = {};
    const errors: string[] = [];

    for (const name of SHEET_NAMES) {
      try {
        results[name] = await readSheet(name);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${name}: ${msg}`);
        results[name] = [];
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Some sheets failed', sheetErrors: errors }, { status: 500 });
    }

    const skuRows = results['SKUs'];
    const platformRows = results['Platforms'];
    const feeLogRows = results['FeeChangeLogs'];
    const snapshotMetaRows = results['Snapshots'];
    const snapshotDetailRows = results['SnapshotDetails'];
    const settingsRows = results['Settings'];
    const adsRows = results['GlobalAdsPercent'];

    // Parse each dataset
    const skus = skuRows.length > 1 ? skuRows.slice(1).map(row => rowToSku(row)) : [];
    const platforms = platformRows.length > 1 ? platformRows.slice(1).map(row => rowToPlatform(row)) : DEFAULT_PLATFORMS;
    const feeChangeLogs = feeLogRows.length > 1 ? feeLogRows.slice(1).map(row => rowToFeeLog(row)) : [];
    const snapshots = rowsToSnapshots(snapshotMetaRows, snapshotDetailRows);
    const settings = settingsRows.length > 1 ? rowToSettings(settingsRows[1]) : DEFAULT_SETTINGS;
    const globalAdsPercent = adsRows.length > 1 ? (parseFloat(adsRows[1]?.[0] || '0') || 0) : 0;

    const data: SyncData = {
      skus, platforms, globalAdsPercent, feeChangeLogs, snapshots, settings,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to sync from Sheets:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to sync from Sheets', details: message }, { status: 500 });
  }
}
