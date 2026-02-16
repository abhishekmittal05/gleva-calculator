// Google Sheets API client — server-side only (used in API routes)
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function getSheets() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// Read all rows from a sheet tab
export async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:BZ`,
  });
  return (response.data.values || []) as string[][];
}

// Replace entire sheet content (clear + write)
export async function writeSheet(sheetName: string, values: (string | number)[][]) {
  const sheets = getSheets();
  // Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:BZ`,
  });
  // Write new data
  if (values.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
}

// Append rows to a sheet
export async function appendToSheet(sheetName: string, rows: (string | number)[][]) {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:BZ`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
}

// Delete rows matching a condition (read, filter, rewrite)
export async function deleteRows(sheetName: string, filterFn: (row: string[]) => boolean) {
  const rows = await readSheet(sheetName);
  if (rows.length <= 1) return; // only header or empty
  const header = rows[0];
  const dataRows = rows.slice(1).filter(row => !filterFn(row));
  await writeSheet(sheetName, [header, ...dataRows]);
}
