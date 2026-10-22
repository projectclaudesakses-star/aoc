/**
 * Backend Google Apps Script untuk menerima data scan barcode dari HP
 * dan menyimpannya ke Google Sheets (sheet EL1).
 *
 * CARA DEPLOY:
 * 1. Buka https://script.google.com -> New Project
 * 2. Copy-paste seluruh file ini ke editor
 * 3. Klik Deploy -> New deployment -> Type: Web app
 *    - Execute as: Me (akun kamu)
 *    - Who has access: Anyone
 * 4. Copy URL Web app yang muncul, lalu paste ke file web/index.html
 *    pada konstanta APPS_SCRIPT_URL.
 */

const SHEET_ID = '1S3nAnX5ije6prGTwnJ7sZsdYmQtu7q8g';
const SHEET_NAME = 'EL1';

// Struktur kolom di EL1:
// A=TIMESTAMP  B=CHECK IN  C-G=NAME/COUNTRY/COMPANY/CATEGORY/BUS CODE (biarkan apa adanya — biasanya formula lookup)
// H=STATUS  I=AGENDA  J=CHECKIN  K=TEMPAT CHECKIN
const COL_TIMESTAMP = 1;   // A
const COL_CHECKIN_ID = 2;  // B
const COL_STATUS = 8;      // H
const COL_AGENDA = 9;      // I
const COL_CHECKIN_TS = 10; // J
const COL_TEMPAT = 11;     // K

const DATA_HEADER_ROW = 1; // header di baris 1

function doGet(e) {
  // Buka URL "?debug=1" di browser untuk memastikan script menulis
  // ke spreadsheet & tab yang benar.
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    return jsonOut({
      ok: true,
      service: 'absensi-scanner',
      spreadsheet_id: SHEET_ID,
      spreadsheet_name: ss.getName(),
      spreadsheet_url: ss.getUrl(),
      sheet_name: SHEET_NAME,
      sheet_found: sheet !== null,
      all_sheet_names: ss.getSheets().map(function (s) { return s.getName(); }),
      last_row: sheet ? sheet.getLastRow() : null,
    });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    const barcode = (body.barcode || '').toString().trim();
    const tempat = (body.tempat || '').toString().slice(0, 120);

    if (!barcode) {
      return jsonOut({ ok: false, error: 'Barcode kosong' });
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonOut({ ok: false, error: 'Sheet "' + SHEET_NAME + '" tidak ditemukan' });
    }

    const now = new Date();
    const tz = ss.getSpreadsheetTimeZone() || 'Asia/Jakarta';
    const tanggal = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const jam = Utilities.formatDate(now, tz, 'HH:mm:ss');

    // Cari baris kosong berdasarkan KOLOM B (CHECK IN) saja —
    // bukan getLastRow() seluruh sheet, karena sheet ini punya
    // formula/konten di kolom lain yang terbentang jauh ke bawah.
    const lastRowB = findLastRowInColumn(sheet, COL_CHECKIN_ID);
    const targetRow = Math.max(DATA_HEADER_ROW + 1, lastRowB + 1);

    // Cek duplikat per hari — scan kolom B+A dari header sampai lastRowB.
    if (lastRowB >= DATA_HEADER_ROW + 1) {
      const existing = sheet.getRange(DATA_HEADER_ROW + 1, 1, lastRowB - DATA_HEADER_ROW, 2).getValues();
      for (let i = 0; i < existing.length; i++) {
        const existingTs = existing[i][0];
        const existingId = String(existing[i][1]).trim();
        if (existingId === barcode && isSameDay(existingTs, now, tz)) {
          return jsonOut({
            ok: true,
            duplicate: true,
            message: 'Sudah tercatat hari ini',
            barcode: barcode,
            row: DATA_HEADER_ROW + 1 + i,
          });
        }
      }
    }

    // Tulis per sel supaya tidak menimpa kolom C-G yang biasanya berisi
    // formula lookup (NAME, COUNTRY, COMPANY, CATEGORY, BUS CODE).
    sheet.getRange(targetRow, COL_TIMESTAMP).setValue(now);
    sheet.getRange(targetRow, COL_CHECKIN_ID).setValue(barcode);
    sheet.getRange(targetRow, COL_STATUS).setValue('HADIR');
    sheet.getRange(targetRow, COL_AGENDA).setValue('EL');
    sheet.getRange(targetRow, COL_CHECKIN_TS).setValue(now);
    if (tempat) sheet.getRange(targetRow, COL_TEMPAT).setValue(tempat);
    SpreadsheetApp.flush();

    return jsonOut({
      ok: true,
      duplicate: false,
      barcode: barcode,
      tanggal: tanggal,
      jam: jam,
      row: targetRow,
    });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// Mencari nomor baris terakhir yang berisi data di sebuah kolom tertentu.
// Berbeda dengan getLastRow() yang melihat seluruh sheet, ini hanya
// peduli kolom yang dimaksud (misalnya kolom B / CHECK IN).
function findLastRowInColumn(sheet, colIdx) {
  const maxRows = sheet.getMaxRows();
  if (maxRows < 1) return 0;
  const values = sheet.getRange(1, colIdx, maxRows, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== '' && values[i][0] !== null) {
      return i + 1; // 1-indexed
    }
  }
  return 0;
}

function isSameDay(a, b, tz) {
  if (!(a instanceof Date)) return false;
  const fa = Utilities.formatDate(a, tz, 'yyyy-MM-dd');
  const fb = Utilities.formatDate(b, tz, 'yyyy-MM-dd');
  return fa === fb;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
