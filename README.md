# Scraper Data Toko - Chrome Extension

Ekstensi Chrome untuk mengambil data dari website, mencari berdasarkan nama toko, filter tanggal range, dan menghitung total uang secara otomatis. Dilengkapi fitur export ke Excel/CSV.

## Fitur

- Ambil data otomatis dari halaman web (4 strategi scraping)
- Cari berdasarkan nama toko (real-time)
- Filter tanggal range (Dari - Sampai)
- Ringkasan per tanggal (total & jumlah per hari)
- Hitung total uang otomatis (sum semua data / hasil filter)
- Tampilkan total kurang/sisa
- Export ke Excel/CSV (tombol Export)
- Refresh manual dari popup
- Hapus data tersimpan
- Tampilkan status (ready, pending, dll.)

## Instalasi

1. Buka Chrome, ketik chrome://extensions/ di address bar
2. Aktifkan Developer mode (toggle kanan atas)
3. Klik Load unpacked
4. Pilih folder chrome-extension
5. Ekstensi siap digunakan

## Cara Pakai

1. Buka website yang berisi data
2. Klik ikon ekstensi
3. Data otomatis terambil (atau klik Refresh)
4. Gunakan search box untuk cari nama toko
5. Gunakan filter tanggal (Dari/Sampai) untuk filter range tanggal
6. Klik tombol Hapus (✕) untuk reset filter tanggal
7. Ringkasan per tanggal ditampilkan di bawah kartu summary
8. Klik tombol Export untuk download data ke CSV (buka di Excel)

## Format Data yang Didukung

```
#84032 2026-10-29 | Azfar Jaya Abadi H.Unub
Total Rp 2,796,250 | Kurang Rp 2,796,250	ready
```

## Export ke Excel

- Klik tombol "Export" di footer popup
- File CSV akan di-download dengan nama "data-toko-YYYY-MM-DD.csv"
- Buka file di Excel (double-click) - format sudah sesuai Excel
- Data yang di-export sesuai dengan filter aktif (search + tanggal range)

## Troubleshooting

- Data tidak muncul / tidak lengkap: Pastikan halaman sudah fully loaded, lalu klik Refresh
- Format data berbeda: Sesuaikan regex di content.js
- Export tidak jalan: Pastikan ada data yang ditampilkan (tidak kosong)

## Catatan

- Extension berjalan di semua website
- Data tersimpan lokal di chrome.storage.local
- Scraper menggunakan 4 pendekatan: block regex, line-by-line, independent matching, DOM-based
- Export menghasilkan file CSV dengan BOM (UTF-8) agar Excel membaca karakter Indonesia dengan benar