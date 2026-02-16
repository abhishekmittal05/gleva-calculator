import { NextResponse } from 'next/server';
import { readSheet, writeSheet } from '@/lib/sheets';
import { buildSkuHeader, skuToRow, rowToSku } from '@/lib/sync';
import { SKU } from '@/lib/calculations';

// GET: Read all SKUs from Google Sheets
export async function GET() {
  try {
    const rows = await readSheet('SKUs');
    if (rows.length <= 1) return NextResponse.json([]);
    const skus = rows.slice(1).map(row => rowToSku(row));
    return NextResponse.json(skus);
  } catch (error) {
    console.error('Failed to read SKUs from Sheets:', error);
    return NextResponse.json({ error: 'Failed to read SKUs' }, { status: 500 });
  }
}

// PUT: Replace all SKUs in Google Sheets
export async function PUT(request: Request) {
  try {
    const skus: SKU[] = await request.json();
    const header = buildSkuHeader();
    const dataRows = skus.map(sku => skuToRow(sku));
    await writeSheet('SKUs', [header, ...dataRows]);
    return NextResponse.json({ success: true, count: skus.length });
  } catch (error) {
    console.error('Failed to write SKUs to Sheets:', error);
    return NextResponse.json({ error: 'Failed to write SKUs' }, { status: 500 });
  }
}
