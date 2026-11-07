# Halte 🚏

> **Aplikasi Penjelajah, Pelacak, dan Perencana Perjalanan Transportasi Publik Jakarta & Jabodetabek.**

Halte mengadopsi dan mengembangkan filosofi desain minimalis dari [Comuline](https://github.com/comuline/web) ke dalam ekosistem transportasi publik perkotaan terintegrasi di Jabodetabek: **Transjakarta BRT**, **Metrotrans**, **Mikrotrans (Jaklingko)**, serta ekspansi multimodal **MRT Jakarta**, **LRT Jakarta**, **LRT Jabodebek**, dan **KRL Commuter Line**.

---

## ⚡ Fitur Utama

Aplikasi Halte dibangun dalam lima bagian inti:

1. **Beranda (`/beranda`)**
   - Pencarian kilat universal (*Cmd+K / Ctrl+K*).
   - Deteksi halte terdekat berdasarkan posisi GPS pengguna secara *real-time* atau titik pusat Jakarta.
   - Status operasional jaringan 14 koridor BRT & Mikrotrans secara transparan.
   - Akses cepat daftar 14 Koridor Utama Transjakarta dengan kode warna resmi.
   - Informasi integrasi tarif (Rp 3.500 flat Transjakarta / Rp 0 gratis Mikrotrans Jaklingko).

2. **Jalur (`/jalur`)**
   - Katalog 246 rute transportasi Jabodetabek yang dapat difilter berdasarkan moda:
     - **BRT Koridor:** Koridor 1 s/d 14 beserta rute cabang ekspres (1A, 2A, 3F, 5C, 6B, 9A, dll.)
     - **Metrotrans Feeder:** Angkutan umum integrasi pengumpan non-BRT (1E, 1H, 2P, 4B, 5M, dll.)
     - **Mikrotrans:** Angkutan lingkungan Jaklingko (JAK.01 s/d JAK.120)
     - **Rel & Kereta:** MRT Jakarta Lin Utara-Selatan, LRT Jakarta Fase 1, LRT Jabodebek, KRL Commuter Line.
   - Detail rute interaktif: Urutan halte lengkap arah berangkat (*outbound*) dan arah kembali (*inbound*), tarif, *headway*, dan jam operasional.

3. **Lacak (`/lacak`)**
   - Peta pelacak armada bus secara *real-time* dengan MapLibre / Leaflet di atas peta monokrom bersih CartoDB Positron.
   - Menampilkan posisi bus, nomor bodi armada (cth: `TJ-082`, `MYS-17124`, `PPD-0391`), sudut kemudi (*bearing* kompas), kecepatan GPS (km/j), status okupansi penumpang (*Sepi / Sedang / Padat*), dan estimasi waktu tiba (ETA) di halte berikutnya.
   - Indikator kejujuran sumber data (*Telemetry Transparency Banner*): Membedakan secara transparan antara telemetri aktif resmi, polling REST TiJe, dan status broker MQTT.

4. **Rute (`/rute`)**
   - Mesin perencana perjalanan (*Journey Planner*) multi-kriteria cerdas:
     - **Tercepat (*Fastest*):** Meminimalkan durasi total perjalanan (jalan kaki + waktu tunggu + laju kendaraan).
     - **Sedikit Transit (*Fewest Transfers*):** Mengutamakan perjalanan langsung tanpa oper.
     - **Termurah (*Cheapest*):** Mengutamakan integrasi Mikrotrans Rp 0 dan tarif flat Transjakarta Rp 3.500.
     - **Paling Sederhana (*Simplest*):** Meminimalkan jarak tempuh jalan kaki dan kerumitan integrasi.
   - *Itinerary* langkah demi langkah dilengkapi estimasi tarif, waktu tunggu halte, dan daftar halte yang dilintasi.

5. **Halte (`/halte`)**
   - Direktori lebih dari 8.100 halte dan stasiun terverifikasi di wilayah Jabodetabek.
   - Urutan jarak terdekat dari lokasi pengguna.
   - Filter fasilitas: Ramah disabilitas / kursi roda, eskalator, lift, toilet, dan musholla.
   - Panel detail halte: Daftar seluruh rute yang melayani halte tersebut, aksi jadikan asal/tujuan rute perjalanan, dan koordinat GPS presisi.

---

## 🔍 Investigasi & Verifikasi Sumber Data Transportasi

| Sumber Data | Status Aksesibilitas | Temuan Teknis & Catatan Integrasi |
| :--- | :--- | :--- |
| **1. open-tj SDK & Dokumentasi** | ✅ Terverifikasi | Modul Go pihak ketiga karya `BroNils` yang mendokumentasikan 94 endpoint REST TiJe API, skema MQTT bus armada, dan WebSocket chatbot Tara. |
| **2. Transjakarta TiJe REST API** | ✅ Berfungsi Penuh | Host: `https://tijeapi.transjakarta.co.id/v1`<br>• `POST /v1/auth/login/guest`: Menghasilkan token JWT tamu yang valid.<br>• `GET /v1/route`: Berhasil mengembalikan seluruh rute dan atribut warna resmi.<br>• `GET /v1/route/:id`: Mengembalikan halte *inbound* & *outbound* secara lengkap.<br>• `GET /v1/bus-stop?latitude=&longitude=`: Berhasil mengembalikan halte terdekat dan fasilitas.<br>• `POST /v1/bus`: Mengembalikan posisi armada bus di sekitar koordinat. |
| **3. Transjakarta MQTT WSS Broker** | ⚠️ Terproteksi Otorisasi | Host: `wss://mqtt.tj.co.id:8084/mqtt`<br>• Port 8084 (WSS) dan 1883 (TCP) aktif.<br>• Sertifikat TLS wildcard `*.tj.co.id` valid hingga Maret 2027.<br>• Koneksi klien anonim saat ini ditolak (`Connection refused: Not authorized`) karena PT Transportasi Jakarta kini membatasi broker armada ke akun operator resmi. Halte mengintegrasikannya secara transparan dengan visualisasi status dan *fallback* ke polling TiJe REST / simulasi GTFS presisi tinggi. |
| **4. GTFS Resmi Transjakarta** | ✅ Berfungsi Penuh | Unduhan langsung: `https://gtfs.transjakarta.co.id/files/file_gtfs.zip` (2.5 MB).<br>Memuat file resmi: `routes.txt`, `stops.txt`, `shapes.txt` (7.8 MB polylines koordinat jalan raya), `trips.txt`, `stop_times.txt`, dan `fare_attributes.txt`. Data ini dinormalisasi ke dalam direktori internal Halte. |
| **5. ArcGIS FeatureServer** | ❌ Tidak Aktif (ENODATA) | Domain `gis.transjakarta.co.id` tidak lagi memiliki DNS A-record aktif (telah dinonaktifkan / digantikan oleh portal GTFS dan TiJe API). |
| **6. data.go.id & TUMI Datahub** | ⚠️ Terbatas / Timeout | Endpoint pencarian `data.go.id` mengembalikan HTTP 404, sedangkan portal TUMI lambat/timeout. Basis data resmi GTFS Transjakarta dan API TiJe digunakan sebagai sumber primer otoritatif. |

---

## 🛠️ Arsitektur Teknologi

Aplikasi dibangun **murni dengan JavaScript (`.js` dan `.jsx`)** tanpa TypeScript, mengikuti ketentuan proyek:

- **Frontend:** React 19 + Vite
- **Styling & UI Tokens:** Tailwind CSS v4 + Font Geist Sans & Geist Mono
- **Ikonografi:** Lucide React
- **Pemetaan:** Leaflet dengan *tileset* CartoDB Positron monokrom bersih
- **Manajemen Data & State:** Modul data terisolasi, Reactive Telemetry Engine, dan TiJe API Client terintegrasi

---

## 🚀 Panduan Menjalankan Aplikasi

Pastikan Node.js dan npm telah terpasang di sistem.

```bash
# 1. Masuk ke direktori proyek
cd c:\Users\Administrator\Documents\Halte

# 2. Instalasi dependensi
npm install

# 3. Menjalankan server pengembangan (Development)
npm run dev

# 4. Melakukan kompilasi produksi (Production Build)
npm run build

# 5. Menjalankan pratinjau produksi (Preview Server)
npm run preview
```

Server pratinjau akan berjalan di `http://localhost:4173` atau `http://localhost:3000`.
