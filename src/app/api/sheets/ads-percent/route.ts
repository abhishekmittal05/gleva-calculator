import { NextResponse } from 'next/server';
import { readSheet, writeSheet } from '@/lib/sheets';
import { buildAdsHeader } from '@/lib/sync';

// GET: Read global ads percent
export async function GET() {
  try {
    const rows = await readSheet('GlobalAdsPercent');
    if (rows.length <= 1) return NextResponse.json({ value: 0 });
    const value = parseFloat(rows[1]?.[0] || '0') || 0;
    return NextResponse.json({ value });
  } catch (error) {
    console.error('Failed to read GlobalAdsPercent from Sheets:', error);
    return NextResponse.json({ error: 'Failed to read GlobalAdsPercent' }, { status: 500 });
  }
}

// PUT: Update global ads percent
export async function PUT(request: Request) {
  try {
    const { value } = await request.json();
    const header = buildAdsHeader();
    await writeSheet('GlobalAdsPercent', [header, [value]]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write GlobalAdsPercent to Sheets:', error);
    return NextResponse.json({ error: 'Failed to write GlobalAdsPercent' }, { status: 500 });
  }
}
