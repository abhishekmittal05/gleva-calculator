import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/sheets';
import {
  rowToSku, rowToPlatform, rowToFeeLog, rowsToSnapshots,
  rowToSettings,
} from '@/lib/sync';
import { DEFAULT_PLATFORMS, DEFAULT_SETTINGS } from '@/lib/calculations';
import type { SyncData } from '@/lib/sync';

// GET: Read ALL data from Google Sheets in a single API call
// This reduces client-side round trips — one fetch gets everything
export async function GET() {
  try {
    // Read all 7 sheets in parallel
    const [skuRows, platformRows, feeLogRows, snapshotMetaRows, snapshotDetailRows, settingsRows, adsRows] =
      await Promise.all([
        readSheet('SKUs'),
        readSheet('Platforms'),
        readSheet('FeeChangeLogs'),
        readSheet('Snapshots'),
        readSheet('SnapshotDetails'),
        readSheet('Settings'),
        readSheet('GlobalAdsPercent'),
      ]);

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
    return NextResponse.json({ error: 'Failed to sync from Sheets' }, { status: 500 });
  }
}
