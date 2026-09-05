# 📋 PROJECT INDEX — KasirPro

> **⚠️ INSTRUKSI UNTUK AI AGENT:**  
> Baca file ini **SELURUHNYA** sebelum menulis, mengedit, atau menghapus kode apapun.  
> Jangan asumsikan struktur proyek — gunakan informasi di bawah sebagai sumber kebenaran.

---

## 1. Identitas Proyek

| Key | Value |
|-----|-------|
| **Nama** | KasirPro (Aplikasi Kasir Sembako) |
| **Tipe** | Desktop POS (Point of Sale) |
| **Platform** | Windows (Electron) |
| **Bahasa** | JavaScript (CommonJS) |
| **Database** | SQLite3 (lokal, file-based) |
| **Build** | Electron Forge → Squirrel Installer (.exe) |
| **Author** | Hendri .O |
| **Versi** | 1.0.0 |

---

## 2. Arsitektur (Context Isolation)

```
┌──────────────────────────────────────────────────────────┐
│                      Electron App                         │
│                                                           │
│  ┌──────────┐  preload.js   ┌──────────────────────────┐ │
│  │ main.js  │──────────────→│  index.html + renderer.js│ │
│  │ (Main)   │  contextBridge│  (Renderer Process)      │ │
│  │          │←── IPC ──────→│  window.api.*            │ │
│  │          │               └──────────────────────────┘ │
│  │          │                                            │
│  │  ┌───────┴────────┐                                   │
│  │  │ SQLite DB      │                                   │
│  │  │ (kasirpro.db)  │                                   │
│  │  └────────────────┘                                   │
│  └──────────┘                                            │
└──────────────────────────────────────────────────────────┘
```

**Prinsip keamanan:**
- `nodeIntegration: false` — renderer TIDAK bisa akses Node.js
- `contextIsolation: true` — renderer terisolasi dari main process
- `preload.js` + `contextBridge` — hanya channel IPC yang diizinkan yang terekspos
- Semua operasi database terjadi di **main process** via IPC handlers
- Renderer hanya bisa panggil `window.api.*`

---

## 3. Peta File (File Map)

```
KasirSembako/
│
├── main.js              → Electron main process
│                          ├── BrowserWindow (contextIsolation: true)
│                          ├── Inisialisasi DB (SQLite di APPDATA)
│                          │   ├── Tabel: produk, transaksi, detail_transaksi
│                          ├── IPC Handlers:
│                          │   ├── db:search-produk
│                          │   ├── db:get-all-produk
│                          │   ├── db:insert-produk
│                          │   ├── db:update-produk
│                          │   ├── db:delete-produk
│                          │   ├── db:proses-transaksi (+ detail items)
│                          │   ├── db:get-laporan
│                          │   ├── db:get-detail-transaksi
│                          │   ├── db:get-omzet-bulan
│                          │   ├── db:ekspor-csv
│                          │   └── db:reset-database
│                          └── Save dialog handler
│
├── preload.js           → Context bridge (window.api)
│                          Expose IPC channels ke renderer secara aman
│
├── renderer.js          → Orchestrator (thin entry point)
│                          ├── Shared namespace: window.KasirPro
│                          ├── escapeHTML() — sanitasi XSS
│                          ├── tampilNotif() — modal notifikasi
│                          ├── DOM caching & event wiring
│                          └── Jam digital
│
├── js/                  → Modul bisnis (IIFE, window.KasirPro namespace)
│   ├── cart.js          → Keranjang, pembayaran, struk, pencarian produk
│   ├── product.js       → CRUD produk, manajemen stok
│   └── report.js        → Laporan, filter tanggal, ekspor CSV, detail transaksi
│
├── styles.css           → Seluruh CSS (diekstrak dari index.html)
│
├── index.html           → UI tunggal (693 baris, no inline CSS)
│                          ├── Sidebar navigasi
│                          ├── Dashboard POS (search + cart + checkout)
│                          ├── Modal: Laporan Penjualan
│                          ├── Modal: Detail Transaksi (BARU)
│                          ├── Modal: Pengaturan (dark mode, identitas toko, shortcut info, reset DB)
│                          ├── Modal: Konfirmasi Hapus
│                          ├── Modal: Form Produk (tambah/edit)
│                          ├── Modal: Manajemen Stok
│                          ├── Modal: Preview Struk
│                          └── Modal: Notifikasi
│
├── forge.config.js      → Konfigurasi Electron Forge (satu-satunya sumber, makers, plugins)
├── package.json         → Dependencies & metadata (tanpa inline forge config)
├── assets/
│   └── icon.ico         → Ikon aplikasi (231 KB)
├── .gitignore
└── PROJECT_INDEX.md     → FILE INI
```

---

## 4. IPC Channel Reference

| Channel | Arah | Parameter | Return |
|---------|------|-----------|--------|
| `db:search-produk` | renderer→main | `keyword: string` | `Array<{id, nama, harga, stok}>` |
| `db:get-all-produk` | renderer→main | `keyword: string` | `Array<{id, nama, harga, stok}>` |
| `db:insert-produk` | renderer→main | `{nama, harga, stok}` | `{lastID, changes}` |
| `db:update-produk` | renderer→main | `{id, nama, harga, stok}` | `{lastID, changes}` |
| `db:delete-produk` | renderer→main | `id: number` | `{lastID, changes}` |
| `db:proses-transaksi` | renderer→main | `{total, items: [{id, nama, harga, qty, subtotal}]}` | `{success, transaksiId}` |
| `db:get-laporan` | renderer→main | `{tglAwal?, tglAkhir?}` | `{omzet, count, riwayat[], isFiltered}` |
| `db:get-detail-transaksi` | renderer→main | `transaksiId: number` | `Array<{nama_produk, harga_satuan, jumlah, subtotal}>` |
| `db:get-omzet-bulan` | renderer→main | — | `number` |
| `db:ekspor-csv` | renderer→main | `{tglAwal?, tglAkhir?}` | `{success, message}` |
| `db:reset-database` | renderer→main | — | `{success: true}` |

---

## 5. Skema Database (Aktif)

**Lokasi file DB:** `%APPDATA%/KasirProData/kasirpro.db`

```sql
-- Tabel Produk
CREATE TABLE IF NOT EXISTS produk (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nama  TEXT,
    harga REAL,
    stok  INTEGER
);

-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS transaksi (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal DATE DEFAULT (DATE('now','localtime')),
    waktu   DATETIME DEFAULT (DATETIME('now','localtime')),
    total   REAL
);

-- Tabel Detail Transaksi (item per transaksi)
CREATE TABLE IF NOT EXISTS detail_transaksi (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    transaksi_id  INTEGER NOT NULL,
    produk_id     INTEGER,
    nama_produk   TEXT NOT NULL,
    harga_satuan  REAL NOT NULL,
    jumlah        INTEGER NOT NULL,
    subtotal      REAL NOT NULL,
    FOREIGN KEY (transaksi_id) REFERENCES transaksi(id),
    FOREIGN KEY (produk_id) REFERENCES produk(id)
);
```

---

## 6. Konvensi Kode

### Penamaan
- **CSS Variables:** Bahasa Indonesia (`--aksen`, `--sukses`, `--bahaya`, `--teks-gelap`)
- **ID HTML:** camelCase (`searchInput`, `grandTotalDisplay`, `btnBayar`)
- **Fungsi JS:** camelCase, bahasa Indonesia (`tampilNotif`, `hitungKembalian`, `loadStok`)
- **Tabel DB:** lowercase, bahasa Indonesia (`produk`, `transaksi`)
- **IPC Channels:** `db:<aksi-kebab-case>` (contoh: `db:search-produk`)

### Pattern
- **Module system:** CommonJS (`require`) hanya di main.js & preload.js
- **Renderer:** Murni browser JS, akses DB via `window.api.*`
- **JS Modularisasi:** IIFE per modul, shared namespace `window.KasirPro`
- **XSS Prevention:** `escapeHTML()` untuk konten dinamis, `textContent` untuk teks biasa
- **Modal management:** Z-index manual (2000 → 2500 → 3000 → 3500 → 4000)
- **State:** Array `keranjang` di `js/cart.js` (scoped dalam IIFE)
- **Notifikasi:** `tampilNotif(judul, pesan, ikon)` — modal notif
- **Modal buka/tutup:** Helper `setupModal(btnId, modalId, closeId)`
- **Async:** Semua operasi DB menggunakan `async/await`

### Font
- **UI:** Plus Jakarta Sans (400, 600, 800)
- **Monospace:** JetBrains Mono (500) — untuk jam, struk

### Warna (CSS Variables)
| Variable | Hex | Kegunaan |
|----------|-----|----------|
| `--aksen` | `#6366f1` | Primary (indigo) |
| `--aksen-hover` | `#4f46e5` | Primary hover |
| `--sukses` | `#10b981` | Hijau (berhasil) |
| `--bahaya` | `#ef4444` | Merah (hapus, error) |
| `--peringatan` | `#f59e0b` | Kuning (warning) |
| `--bg` | `#f8fafc` | Background |
| `--panel` | `#ffffff` | Panel/card |
| `--teks-gelap` | `#0f172a` | Teks utama |
| `--teks-terang` | `#64748b` | Teks sekunder |
| `--border` | `#e2e8f0` | Border |

---

## 7. Masalah yang Diketahui (Known Issues)

### ✅ RESOLVED
| # | Masalah | Status |
|---|---------|--------|
| K1 | ~~`nodeIntegration: true` + `contextIsolation: false`~~ | ✅ Fixed — contextIsolation aktif, preload.js dibuat |
| K2 | ~~`innerHTML` tanpa sanitasi~~ | ✅ Fixed — semua diganti `textContent` + `escapeHTML()` |
| K3 | ~~`database.js` dead code~~ | ✅ Fixed — file dihapus |
| S1 | ~~Tombol "Ekspor CSV" tidak ada handler~~ | ✅ Fixed — implementasi lengkap di main.js + renderer.js |

| S2 | ~~`electron-pos-printer` tidak digunakan~~ | ✅ Fixed — dihapus dari dependencies |
| S3 | ~~Item per transaksi tidak tersimpan~~ | ✅ Fixed — tabel `detail_transaksi` + IPC handler |
| S4 | ~~Keyboard shortcut F8 tidak diimplementasi~~ | ✅ Fixed — F8 (fokus bayar), Enter (proses), Escape (tutup modal) |
| S5 | ~~Duplikasi konfigurasi forge~~ | ✅ Fixed — hapus inline config dari package.json, forge.config.js satu-satunya |
| M1 | ~~Tidak ada dark mode~~ | ✅ Fixed — body.dark-mode class + localStorage persist + toggle di Pengaturan |
| M2 | ~~Tidak ada empty state di keranjang~~ | ✅ Fixed — tampil 🛒 + teks panduan saat kosong |
| M3 | ~~Struk hardcode "TOKO HANIF"~~ | ✅ Fixed — configurable via Pengaturan, disimpan di localStorage |

---

## 8. Dependencies

### Production
| Package | Versi | Digunakan? |
|---------|-------|------------|
| sqlite3 | ^5.0.2 | ✅ Ya, di `main.js` |
| electron-squirrel-startup | ^1.0.1 | ✅ Ya, di `main.js` |

### Dev
| Package | Versi |
|---------|-------|
| electron | ^40.6.1 |
| @electron-forge/cli | ^7.6.1 |
| @electron-forge/maker-squirrel | ^7.6.1 |
| @electron-forge/maker-zip | ^7.11.1 |
| @electron-forge/plugin-auto-unpack-natives | ^7.11.1 |

---

## 9. Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan development
npm start
# atau
npx electron-forge start

# Build installer Windows
npm run make
```

---

## 10. Aturan untuk AI Agent

> **WAJIB dipatuhi sebelum melakukan perubahan apapun:**

### ✅ BOLEH
- Edit `renderer.js`, `index.html`, `main.js`, `preload.js`, `forge.config.js`, `package.json`
- Tambah file baru (misal: `styles.css`, modul JS terpisah)
- Perbaiki known issues yang tercantum di bagian 7
- Tambah IPC channel baru (update tabel di bagian 4)
- Tambah entry baru ke PROJECT_INDEX.md setelah membuat file/fitur baru

### ❌ JANGAN
- **Jangan aktifkan `nodeIntegration`** di main.js — sudah di-fix
- **Jangan gunakan `require()` di renderer.js** — hanya `window.api.*`
- **Jangan gunakan `innerHTML` dengan data user** — gunakan `textContent` atau `escapeHTML()`
- **Jangan ubah lokasi database** tanpa migrasi data (`%APPDATA%/KasirProData/kasirpro.db`)
- **Jangan ubah nama tabel/kolom DB** tanpa migrasi — data user akan hilang
- **Jangan hapus CSS variables** — digunakan secara konsisten di seluruh UI
- **Jangan ganti font** tanpa persetujuan user
- **Jangan ubah nama aplikasi** dari "KasirPro" tanpa persetujuan user

### 📝 SETELAH PERUBAHAN
- **Update file ini** (`PROJECT_INDEX.md`) jika:
  - Menambah/menghapus file
  - Menambah IPC channel baru
  - Mengubah skema database
  - Menambah dependency baru
  - Menyelesaikan known issue (tandai ✅ RESOLVED)
  - Menambah fitur baru

---

*Terakhir diperbarui: 5 September 2026*
