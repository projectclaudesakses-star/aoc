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

// Kolom header yang diharapkan (dibuat otomatis bila sheet masih kosong).
const HEADERS = ['Timestamp', 'Barcode ID', 'Tanggal', 'Jam', 'Device'];

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'absensi-scanner' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const barcode = (body.barcode || '').toString().trim();
    const device = (body.device || '').toString().slice(0, 120);

    if (!barcode) {
      return jsonOut({ ok: false, error: 'Barcode kosong' });
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonOut({ ok: false, error: 'Sheet "' + SHEET_NAME + '" tidak ditemukan' });
    }

    // Pastikan header ada
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    }

    const now = new Date();
    const tz = ss.getSpreadsheetTimeZone() || 'Asia/Jakarta';
    const tanggal = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
    const jam = Utilities.formatDate(now, tz, 'HH:mm:ss');

    // Cek duplikat: barcode yang sama di tanggal yang sama tidak dicatat ulang.
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === barcode && String(data[i][2]) === tanggal) {
        return jsonOut({
          ok: true,
          duplicate: true,
          message: 'Sudah tercatat hari ini pada ' + data[i][3],
          barcode: barcode,
        });
      }
    }

    sheet.appendRow([now, barcode, tanggal, jam, device]);

    return jsonOut({
      ok: true,
      duplicate: false,
      barcode: barcode,
      tanggal: tanggal,
      jam: jam,
    });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
