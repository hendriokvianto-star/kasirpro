const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// --- LOGIKA SHORTCUT OTOMATIS (SQUIRREL HANDLER) ---
// Kode ini harus berada di baris paling atas sebelum inisialisasi lainnya.
// Tujuannya agar saat instalasi, aplikasi menangani pembuatan shortcut lalu berhenti sejenak.
if (require("electron-squirrel-startup")) {
  app.quit();
}

app.disableHardwareAcceleration();

// --- INISIALISASI DATABASE DI MAIN PROCESS ---
const appDataPath =
  process.env.APPDATA ||
  (process.platform === "darwin"
    ? process.env.HOME + "/Library/Preferences"
    : process.env.HOME + "/.local/share");
const dbDir = path.join(appDataPath, "KasirProData");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, "kasirpro.db");
let db = new sqlite3.Database(dbPath);

function initDB() {
  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS produk (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, harga REAL, stok INTEGER)",
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS transaksi (id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal DATE DEFAULT (DATE('now','localtime')), waktu DATETIME DEFAULT (DATETIME('now','localtime')), total REAL)",
    );
    db.run(
      `CREATE TABLE IF NOT EXISTS detail_transaksi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaksi_id INTEGER NOT NULL,
        produk_id INTEGER,
        nama_produk TEXT NOT NULL,
        harga_satuan REAL NOT NULL,
        jumlah INTEGER NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (transaksi_id) REFERENCES transaksi(id),
        FOREIGN KEY (produk_id) REFERENCES produk(id)
      )`,
    );
  });
}
initDB();

// --- Helper: promisify db methods ---
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// --- WINDOW ---
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    icon: path.join(__dirname, "assets/icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#f8fafc",
    show: false,
  });

  mainWindow.loadFile("index.html");

  // Menghilangkan Menu Bar default agar tampilan lebih bersih (Opsional)
  // mainWindow.setMenu(null);

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });
}

// --- IPC HANDLERS ---

// [PRODUK] Cari produk (untuk search bar — hanya stok > 0)
ipcMain.handle("db:search-produk", async (_event, keyword) => {
  const kw = String(keyword || "");
  return dbAll(
    "SELECT * FROM produk WHERE nama LIKE ? AND stok > 0 LIMIT 6",
    [`%${kw}%`],
  );
});

// [PRODUK] Ambil semua produk (untuk manajemen stok)
ipcMain.handle("db:get-all-produk", async (_event, keyword) => {
  const kw = String(keyword || "");
  if (kw) {
    return dbAll("SELECT * FROM produk WHERE nama LIKE ?", [`%${kw}%`]);
  }
  return dbAll("SELECT * FROM produk");
});

// [PRODUK] Insert produk baru
ipcMain.handle("db:insert-produk", async (_event, data) => {
  const { nama, harga, stok } = data;
  return dbRun("INSERT INTO produk (nama, harga, stok) VALUES (?,?,?)", [
    String(nama),
    Number(harga),
    Number(stok),
  ]);
});

// [PRODUK] Update produk
ipcMain.handle("db:update-produk", async (_event, data) => {
  const { id, nama, harga, stok } = data;
  return dbRun("UPDATE produk SET nama=?, harga=?, stok=? WHERE id=?", [
    String(nama),
    Number(harga),
    Number(stok),
    Number(id),
  ]);
});

// [PRODUK] Hapus produk
ipcMain.handle("db:delete-produk", async (_event, id) => {
  return dbRun("DELETE FROM produk WHERE id=?", [Number(id)]);
});

// [TRANSAKSI] Proses pembayaran — simpan total + detail item
ipcMain.handle("db:proses-transaksi", async (_event, data) => {
  const { total, items } = data;
  const result = await dbRun("INSERT INTO transaksi (total) VALUES (?)", [
    Number(total),
  ]);
  const transaksiId = result.lastID;

  for (const item of items) {
    // Simpan detail item
    await dbRun(
      "INSERT INTO detail_transaksi (transaksi_id, produk_id, nama_produk, harga_satuan, jumlah, subtotal) VALUES (?,?,?,?,?,?)",
      [
        transaksiId,
        Number(item.id),
        String(item.nama),
        Number(item.harga),
        Number(item.qty),
        Number(item.subtotal),
      ],
    );
    // Kurangi stok
    await dbRun("UPDATE produk SET stok = stok - ? WHERE id = ?", [
      Number(item.qty),
      Number(item.id),
    ]);
  }
  return { success: true, transaksiId };
});

// [LAPORAN] Ambil data laporan
ipcMain.handle("db:get-laporan", async (_event, filter) => {
  const { tglAwal, tglAkhir } = filter || {};
  let dateQuery = "tanggal = DATE('now','localtime')";
  let params = [];

  if (tglAwal && tglAkhir) {
    dateQuery = "tanggal BETWEEN ? AND ?";
    params = [String(tglAwal), String(tglAkhir)];
  }

  const omzet = await dbGet(
    `SELECT SUM(total) as t, COUNT(*) as c FROM transaksi WHERE ${dateQuery}`,
    params,
  );
  const riwayat = await dbAll(
    `SELECT id, waktu, total FROM transaksi WHERE ${dateQuery} ORDER BY id DESC LIMIT 50`,
    params,
  );

  return {
    omzet: omzet?.t || 0,
    count: omzet?.c || 0,
    riwayat: riwayat,
    isFiltered: !!(tglAwal && tglAkhir),
  };
});

// [LAPORAN] Ambil detail item per transaksi
ipcMain.handle("db:get-detail-transaksi", async (_event, transaksiId) => {
  return dbAll(
    "SELECT nama_produk, harga_satuan, jumlah, subtotal FROM detail_transaksi WHERE transaksi_id = ? ORDER BY id",
    [Number(transaksiId)],
  );
});

// [LAPORAN] Omzet bulan ini
ipcMain.handle("db:get-omzet-bulan", async () => {
  const row = await dbGet(
    "SELECT SUM(total) as t_bulan FROM transaksi WHERE strftime('%m', tanggal) = strftime('%m', 'now', 'localtime')",
  );
  return row?.t_bulan || 0;
});

// [LAPORAN] Ekspor CSV
ipcMain.handle("db:ekspor-csv", async (_event, filter) => {
  const { tglAwal, tglAkhir } = filter || {};
  let dateQuery = "tanggal = DATE('now','localtime')";
  let params = [];
  let namaFile = "laporan_hari_ini";

  if (tglAwal && tglAkhir) {
    dateQuery = "tanggal BETWEEN ? AND ?";
    params = [String(tglAwal), String(tglAkhir)];
    namaFile = `laporan_${tglAwal}_sd_${tglAkhir}`;
  }

  const rows = await dbAll(
    `SELECT id, tanggal, waktu, total FROM transaksi WHERE ${dateQuery} ORDER BY id DESC`,
    params,
  );

  if (rows.length === 0) {
    return { success: false, message: "Tidak ada data untuk diekspor." };
  }

  // Format CSV
  let csv = "No,ID Transaksi,Tanggal,Waktu,Total (Rp)\n";
  let grandTotal = 0;
  rows.forEach((row, idx) => {
    csv += `${idx + 1},${row.id},${row.tanggal},${row.waktu},${row.total}\n`;
    grandTotal += row.total;
  });
  csv += `\n,,,,\n,,,TOTAL OMZET:,${grandTotal}\n,,,JUMLAH TRANSAKSI:,${rows.length}\n`;

  // Dialog simpan file
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Simpan Laporan CSV",
    defaultPath: `${namaFile}.csv`,
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, message: "Ekspor dibatalkan." };
  }

  fs.writeFileSync(result.filePath, csv, "utf-8");
  return {
    success: true,
    message: `Laporan berhasil disimpan ke:\n${result.filePath}`,
  };
});

// [SISTEM] Reset database
ipcMain.handle("db:reset-database", async () => {
  return new Promise((resolve) => {
    db.close(() => {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      db = new sqlite3.Database(dbPath);
      initDB();
      resolve({ success: true });
    });
  });
});

// --- INISIALISASI APLIKASI ---
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
