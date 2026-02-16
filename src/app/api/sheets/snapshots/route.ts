import { NextResponse } from 'next/server';
import { readSheet, writeSheet, appendToSheet } from '@/lib/sheets';
import {
  buildSnapshotHeader, buildSnapshotDetailHeader,
  snapshotToMetaRow, snapshotToDetailRows, rowsToSnapshots,
} from '@/lib/sync';
import { MonthlySnapshot } from '@/lib/calculations';

// GET: Read all snapshots (joins Snapshots + SnapshotDetails)
export async function GET() {
  try {
    const [metaRows, detailRows] = await Promise.all([
      readSheet('Snapshots'),
      readSheet('SnapshotDetails'),
    ]);
    const snapshots = rowsToSnapshots(metaRows, detailRows);
    return NextResponse.json(snapshots);
  } catch (error) {
    console.error('Failed to read Snapshots from Sheets:', error);
    return NextResponse.json({ error: 'Failed to read Snapshots' }, { status: 500 });
  }
}

// POST: Add a new snapshot
export async function POST(request: Request) {
  try {
    const snapshot: MonthlySnapshot = await request.json();

    // Check if Snapshots sheet has a header, if not create one
    const existingMeta = await readSheet('Snapshots');
    if (existingMeta.length === 0) {
      await writeSheet('Snapshots', [buildSnapshotHeader()]);
    }
    const existingDetails = await readSheet('SnapshotDetails');
    if (existingDetails.length === 0) {
      await writeSheet('SnapshotDetails', [buildSnapshotDetailHeader()]);
    }

    // Append metadata row
    await appendToSheet('Snapshots', [snapshotToMetaRow(snapshot)]);
    // Append detail rows
    const detailRows = snapshotToDetailRows(snapshot);
    if (detailRows.length > 0) {
      await appendToSheet('SnapshotDetails', detailRows);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add Snapshot to Sheets:', error);
    return NextResponse.json({ error: 'Failed to add Snapshot' }, { status: 500 });
  }
}

// PUT: Replace all snapshots (for delete operations)
export async function PUT(request: Request) {
  try {
    const snapshots: MonthlySnapshot[] = await request.json();

    // Rebuild both sheets
    const metaHeader = buildSnapshotHeader();
    const metaRows = snapshots.map(s => snapshotToMetaRow(s));

    const detailHeader = buildSnapshotDetailHeader();
    const allDetailRows: (string | number)[][] = [];
    for (const snap of snapshots) {
      allDetailRows.push(...snapshotToDetailRows(snap));
    }

    await Promise.all([
      writeSheet('Snapshots', [metaHeader, ...metaRows]),
      writeSheet('SnapshotDetails', [detailHeader, ...allDetailRows]),
    ]);

    return NextResponse.json({ success: true, count: snapshots.length });
  } catch (error) {
    console.error('Failed to write Snapshots to Sheets:', error);
    return NextResponse.json({ error: 'Failed to write Snapshots' }, { status: 500 });
  }
}
