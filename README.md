# Scraper Data Toko - Chrome Extension

Ekstensi Chrome untuk mengambil data dari website, mencari berdasarkan nama toko, filter per tanggal, dan menghitung total uang secara otomatis.

## Fitur

- Ambil data otomatis dari halaman web (4 strategi scraping)
- Cari berdasarkan nama toko (real-time)
- Filter per tanggal (dropdown)
- Ringkasan per tanggal (total & jumlah per hari)
- Hitung total uang otomatis (sum semua data / hasil filter)
- Tampilkan total kurang/sisa
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
5. Gunakan dropdown tanggal untuk filter per tanggal
6. Ringkasan per tanggal ditampilkan di bawah kartu summary
7. Total uang ditampilkan otomatis di kartu "Total Uang"

## Format Data yang Didukung

```
#84032 2026-10-29 | Azfar Jaya Abadi H.Unub
Total Rp 2,796,250 | Kurang Rp 2,796,250	ready
```

## Troubleshooting

- Data tidak muncul / tidak lengkap: Pastikan halaman sudah fully loaded, lalu klik Refresh. Jika masih gagal, reload halaman (F5).
- Format data berbeda: Sesuaikan regex di content.js
- Filter tanggal kosong: Pastikan data berhasil di-scrape terlebih dahulu

## Catatan

- Extension berjalan di semua website
- Data tersimpan lokal di chrome.storage.local
- Scraper menggunakan 4 pendekatan: block regex, line-by-line, independent matching, DOM-based