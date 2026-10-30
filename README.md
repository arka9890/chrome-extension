# Scraper Data Toko - Chrome Extension

Ekstensi Chrome untuk mengambil data dari website, mencari berdasarkan nama toko, filter tanggal range, dan menghitung total uang secara otomatis. Dilengkapi fitur export ke Excel/CSV. Data dari multiple halaman diakumulasi (tidak hilang).

## Fitur

- Ambil data otomatis dari halaman web (4 strategi scraping)
- Auto-scrape di setiap halaman (retry + deteksi perubahan URL + periodic)
- Cari berdasarkan nama toko (real-time)
- Filter tanggal range (Dari - Sampai)
- Ringkasan per tanggal (total & jumlah per hari)
- Hitung total uang otomatis (sum semua data / hasil filter)
- Tampilkan total kurang/sisa
- **Akumulasi data** - data dari multiple halaman digabung, tidak hilang
- Export ke Excel/CSV (tombol Export)
- Refresh manual dari popup
- Hapus semua data tersimpan
- Tampilkan status (ready, pending, dll.)

## Instalasi

1. Buka Chrome, ketik chrome://extensions/ di address bar
2. Aktifkan Developer mode (toggle kanan atas)
3. Klik Load unpacked
4. Pilih folder chrome-extension
5. Ekstensi siap digunakan

## Cara Pakai

1. Buka website yang berisi data (halaman 1)
2. Data otomatis terambil (atau klik Refresh)
3. Buka halaman 2 (page berikutnya) â data otomatis terambil & digabung
4. Data dari semua halaman terakumulasi (tidak saling menimpa)
5. Gunakan search box untuk cari nama toko
6. Gunakan filter tanggal (Dari/Sampai) untuk filter range tanggal
7. Klik tombol Hapus (â) untuk reset filter tanggal
8. Ringkasan per tanggal ditampilkan di bawah kartu summary
9. Klik tombol Export untuk download data ke CSV (buka di Excel)

## Format Data yang Didukung

```
#84032 2026-10-29 | Azfar Jaya Abadi H.Unub
Total Rp 2,796,250 | Kurang Rp 2,796,250	ready
```

## Auto-Scrape di Setiap Halaman

Extension secara otomatis:
- Scrape saat halaman load (dengan retry 5x jika data belum muncul)
- Deteksi perubahan URL (untuk SPA / navigasi tanpa full reload)
- Re-scrape setiap 10 detik (fallback)
- Re-scrape saat DOM berubah (MutationObserver)

Jadi tidak perlu klik Refresh manual saat pindah halaman.

## Export ke Excel

- Klik tombol "Export" di footer popup
- File CSV akan di-download dengan nama "data-toko-YYYY-MM-DD.csv"
- Buka file di Excel (double-click) - format sudah sesuai Excel
- Data yang di-export sesuai dengan filter aktif (search + tanggal range)
- Termasuk semua data yang terakumulasi dari multiple halaman

## Catatan Penting

- **Data terakumulasi**: Saat scrape halaman baru, data lama TIDAK hilang. Data baru digabung dengan data lama (deduplikasi berdasarkan ID+tanggal).
- Untuk menghapus semua data, klik tombol "Hapus" (ðï¸)
- Export akan menyertakan semua data yang terakumulasi

## Troubleshooting

- Data tidak muncul / tidak lengkap: Pastikan halaman sudah fully loaded. Extension akan retry otomatis.
- Format data berbeda: Sesuaikan regex di content.js
- Export tidak jalan: Pastikan ada data yang ditampilkan (tidak kosong)

## Catatan

- Extension berjalan di semua website
- Data tersimpan lokal di chrome.storage.local
- Scraper menggunakan 4 pendekatan: block regex, line-by-line, independent matching, DOM-based
- Export menghasilkan file CSV dengan BOM (UTF-8) agar Excel membaca karakter Indonesia dengan benar