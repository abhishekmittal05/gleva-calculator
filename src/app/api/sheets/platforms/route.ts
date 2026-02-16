import { NextResponse } from 'next/server';
import { readSheet, writeSheet } from '@/lib/sheets';
import { buildPlatformHeader, platformToRow, rowToPlatform } from '@/lib/sync';
import { PlatformDefinition } from '@/lib/calculations';

// GET: Read all platforms
export async function GET() {
  try {
    const rows = await readSheet('Platforms');
    if (rows.length <= 1) return NextResponse.json([]);
    const platforms = rows.slice(1).map(row => rowToPlatform(row));
    return NextResponse.json(platforms);
  } catch (error) {
    console.error('Failed to read Platforms from Sheets:', error);
    return NextResponse.json({ error: 'Failed to read Platforms' }, { status: 500 });
  }
}

// PUT: Replace all platforms
export async function PUT(request: Request) {
  try {
    const platforms: PlatformDefinition[] = await request.json();
    const header = buildPlatformHeader();
    const dataRows = platforms.map(p => platformToRow(p));
    await writeSheet('Platforms', [header, ...dataRows]);
    return NextResponse.json({ success: true, count: platforms.length });
  } catch (error) {
    console.error('Failed to write Platforms to Sheets:', error);
    return NextResponse.json({ error: 'Failed to write Platforms' }, { status: 500 });
  }
}
