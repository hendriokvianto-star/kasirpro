const { contextBridge, ipcRenderer } = require("electron");

// Expose safe API ke renderer process via window.api
// Renderer TIDAK bisa akses Node.js, fs, sqlite, atau ipcRenderer langsung
contextBridge.exposeInMainWorld("api", {
  // --- PRODUK ---
  searchProduk: (keyword) => ipcRenderer.invoke("db:search-produk", keyword),
  getAllProduk: (keyword) => ipcRenderer.invoke("db:get-all-produk", keyword),
  insertProduk: (data) => ipcRenderer.invoke("db:insert-produk", data),
  updateProduk: (data) => ipcRenderer.invoke("db:update-produk", data),
  deleteProduk: (id) => ipcRenderer.invoke("db:delete-produk", id),

  // --- TRANSAKSI ---
  prosesTransaksi: (data) => ipcRenderer.invoke("db:proses-transaksi", data),

  // --- LAPORAN ---
  getLaporan: (filter) => ipcRenderer.invoke("db:get-laporan", filter),
  getOmzetBulan: () => ipcRenderer.invoke("db:get-omzet-bulan"),
  getDetailTransaksi: (id) => ipcRenderer.invoke("db:get-detail-transaksi", id),
  eksporCSV: (filter) => ipcRenderer.invoke("db:ekspor-csv", filter),

  // --- SISTEM ---
  resetDatabase: () => ipcRenderer.invoke("db:reset-database"),

  // --- AUTH ---
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  gantiPassword: (data) => ipcRenderer.invoke("auth:ganti-password", data),
});
