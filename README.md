# Scraper Data Toko - Chrome Extension

Ekstensi Chrome untuk mengambil data dari 2 website berbeda, membandingkan via ID Invoice, filter tanggal range, dan menghitung total uang. Dilengkapi fitur export ke Excel/CSV.

## Fitur

- Ambil data otomatis dari 2 website (format berbeda, deteksi otomatis)
- Website 1 (Master): format #ID TANGGAL | TOKO / Total Rp X | Kurang Rp Y status
- Website 2 (Compare): format ID TANGGAL System Invoice #X RpY status
- Perbandingan via ID Invoice (cocok, beda nominal, hanya master, hanya web2)
- Cari berdasarkan nama toko (real-time)
- Filter tanggal range (Dari - Sampai) per tab
- Ringkasan per tanggal (dropdown)
- Hitung total uang otomatis
- Tampilkan total kurang/sisa
- Akumulasi data dari multiple halaman
- Export ke Excel/CSV (Master, Web2, atau Perbandingan)
- 3 tab: Master, Website 2, Perbandingan

## Instalasi

1. Buka Chrome, ketik chrome://extensions/ di address bar
2. Aktifkan Developer mode (toggle kanan atas)
3. Klik Load unpacked
4. Pilih folder chrome-extension
5. Ekstensi siap digunakan

## Cara Pakai

### Scrape Master (Website 1)
1. Buka website master → data otomatis terambil
2. Pindah halaman → data otomatis digabung

### Scrape Website 2
1. Buka website 2 → data otomatis terambil (format terdeteksi otomatis)
2. Pindah halaman → data otomatis digabung

### Perbandingan
1. Buka tab "Perbandingan"
2. Lihat ringkasan: Cocok, Hanya Master, Hanya Web2, Beda Nominal
3. Filter: Semua / Cocok / Beda Nominal / Hanya Master / Hanya Web2
4. Detail per invoice: nominal master vs web2, selisih

### Export
- Tab Master → Export data master
- Tab Web2 → Export data website 2
- Tab Perbandingan → Export hasil perbandingan

## Format Data yang Didukung

### Master (Website 1)
```
#84032 2026-10-29 | Azfar Jaya Abadi H.Unub
Total Rp 2,796,250 | Kurang Rp 2,796,250	ready
```

### Website 2
```
10906	2026-10-29 21:32:05		System Invoice #84030	Rp1,239,580	Completed
```

Perbandingan dilakukan via ID Invoice (misal #84030).

## Troubleshooting

- Data tidak muncul: Pastikan halaman sudah fully loaded. Extension retry otomatis.
- Format tidak terdeteksi: Pastikan halaman mengandung "System Invoice" atau "#ID TANGGAL |"
- Perbandingan kosong: Pastikan sudah scrape data dari kedua website

## Catatan

- Extension berjalan di semua website
- Data tersimpan lokal di chrome.storage.local
- Scraper menggunakan 4 pendekatan + deteksi format otomatis
- Export menghasilkan file CSV dengan BOM (UTF-8)