import { NextResponse } from 'next/server';
import { readSheet, writeSheet } from '@/lib/sheets';
import { buildSettingsHeader, settingsToRow, rowToSettings } from '@/lib/sync';
import { AppSettings } from '@/lib/calculations';

// GET: Read settings
export async function GET() {
  try {
    const rows = await readSheet('Settings');
    if (rows.length <= 1) {
      return NextResponse.json({ minMarginAlert: 15, darkMode: false });
    }
    const settings = rowToSettings(rows[1]);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to read Settings from Sheets:', error);
    return NextResponse.json({ error: 'Failed to read Settings' }, { status: 500 });
  }
}

// PUT: Update settings
export async function PUT(request: Request) {
  try {
    const settings: AppSettings = await request.json();
    const header = buildSettingsHeader();
    await writeSheet('Settings', [header, settingsToRow(settings)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write Settings to Sheets:', error);
    return NextResponse.json({ error: 'Failed to write Settings' }, { status: 500 });
  }
}
