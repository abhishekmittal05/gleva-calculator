import { NextResponse } from 'next/server';
import { readSheet, writeSheet, appendToSheet } from '@/lib/sheets';
import { buildFeeLogHeader, feeLogToRow, rowToFeeLog } from '@/lib/sync';
import { FeeChangeLog } from '@/lib/calculations';

// GET: Read all fee change logs
export async function GET() {
  try {
    const rows = await readSheet('FeeChangeLogs');
    if (rows.length <= 1) return NextResponse.json([]);
    const logs = rows.slice(1).map(row => rowToFeeLog(row));
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Failed to read FeeChangeLogs from Sheets:', error);
    return NextResponse.json({ error: 'Failed to read FeeChangeLogs' }, { status: 500 });
  }
}

// PUT: Replace all fee change logs (for clear/full rewrite)
export async function PUT(request: Request) {
  try {
    const logs: FeeChangeLog[] = await request.json();
    const header = buildFeeLogHeader();
    const dataRows = logs.map(log => feeLogToRow(log));
    await writeSheet('FeeChangeLogs', [header, ...dataRows]);
    return NextResponse.json({ success: true, count: logs.length });
  } catch (error) {
    console.error('Failed to write FeeChangeLogs to Sheets:', error);
    return NextResponse.json({ error: 'Failed to write FeeChangeLogs' }, { status: 500 });
  }
}

// POST: Append a single fee change log entry
export async function POST(request: Request) {
  try {
    const log: FeeChangeLog = await request.json();
    await appendToSheet('FeeChangeLogs', [feeLogToRow(log)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to append FeeChangeLog to Sheets:', error);
    return NextResponse.json({ error: 'Failed to append FeeChangeLog' }, { status: 500 });
  }
}
