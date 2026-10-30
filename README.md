# Scraper Data Toko - Chrome Extension

Ekstensi Chrome untuk mengambil data dari website, mencari berdasarkan nama toko, dan menghitung total uang secara otomatis.

## Fitur

- Ambil data otomatis dari halaman web
- Cari berdasarkan nama toko (real-time)
- Hitung total uang otomatis
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
4. Ketik nama toko di search box
5. Total uang ditampilkan otomatis

## Format Data yang Didukung

```
#84032 2026-10-29 | Azfar Jaya Abadi H.Unub
Total Rp 2,796,250 | Kurang Rp 2,796,250	ready
```

## Troubleshooting

- Data tidak muncul: Pastikan halaman sudah fully loaded, lalu klik Refresh
- Format data berbeda: Sesuaikan regex di content.js

## Catatan

- Extension berjalan di semua website
- Data tersimpan lokal di chrome.storage.local