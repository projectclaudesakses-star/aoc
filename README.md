# Scanner Absensi — HP ke Google Sheets

Aplikasi scanner barcode berbasis web yang berjalan di browser HP (tanpa install),
mengirim hasil scan langsung ke Google Sheets.

## Arsitektur

```
[ID Card Barcode] --kamera HP--> [web/index.html]
                                       |
                                       | HTTPS POST (JSON)
                                       v
                           [Google Apps Script Web App]
                                       |
                                       | appendRow
                                       v
                               [Google Sheets — EL1]
                                       |
                                       v
                                   [Dashboard]
```

## Yang perlu disiapkan

1. **Google Sheet** — sudah ada (`1S3nAnX5ije6prGTwnJ7sZsdYmQtu7q8g`, tab `EL1`).
   Script akan membuat header otomatis bila baris pertama kosong:
   `Timestamp | Barcode ID | Tanggal | Jam | Device`.
2. **Akun Google** untuk deploy Apps Script (akun yang sama dengan pemilik sheet).
3. **Hosting halaman scanner** — bisa:
   - GitHub Pages (gratis, otomatis HTTPS — wajib karena kamera butuh HTTPS)
   - Netlify / Vercel drag-and-drop
   - Atau buka langsung dari `localhost` lewat `python3 -m http.server` saat uji coba
4. **ID card dengan barcode** — format apa saja yang didukung kamera: CODE128, QR, EAN, dsb. Rekomendasi: **QR Code** (paling cepat & akurat di kamera HP).

## Langkah 1 — Deploy Apps Script

1. Buka <https://script.google.com> → **New project**.
2. Copy isi `apps-script/Code.gs` ke editor.
3. **Deploy** → **New deployment** → Type: **Web app**
   - *Execute as*: Me
   - *Who has access*: **Anyone**
4. Pertama kali akan minta izin akses Spreadsheet → Allow.
5. Salin **Web app URL** (bentuknya `https://script.google.com/macros/s/.../exec`).

## Langkah 2 — Host halaman scanner

Paling mudah pakai GitHub Pages:

1. Push repo ini ke GitHub (branch `scanner-absensi` sudah ada).
2. Di repo settings → Pages → Source: branch `scanner-absensi`, folder `/web`.
3. Setelah beberapa menit URL muncul, misal:
   `https://<user>.github.io/aoc/`

## Langkah 3 — Pakai di HP

1. Buka URL hosting di browser HP (Chrome / Safari).
2. Di kolom paling bawah, paste **URL Apps Script** → otomatis tersimpan di HP.
3. Tap **Mulai Scan** → izinkan akses kamera.
4. Arahkan ke barcode. Begitu terbaca:
   - "Tercatat ✓" (hijau) → baris baru masuk ke sheet
   - "Sudah tercatat hari ini" (kuning) → anti-dobel per hari per barcode
5. Tambahkan ke home screen (Chrome: **Install app** / Safari: **Add to Home Screen**) agar jadi seperti aplikasi.

## Kolom yang ditulis ke sheet EL1

| Timestamp | Barcode ID | Tanggal | Jam | Device |
|-----------|------------|---------|-----|--------|

- Zona waktu mengikuti setting spreadsheet (atur ke Asia/Jakarta di File → Settings bila belum).
- Baris anti-duplikat per hari — barcode yang sama di tanggal yang sama tidak ditulis ulang.

## Catatan

- Kamera browser hanya aktif di konteks **HTTPS** (atau `localhost`).
- Apps Script Web App dengan access **Anyone** artinya siapapun yang punya URL bisa menulis — URL ini jangan di-publish. Untuk tingkatkan keamanan: tambahkan `token` di body dan cek di `doPost`.
- Satu HP bisa dipakai banyak orang bergantian — tidak perlu login.
