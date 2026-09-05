// renderer.js — KasirPro (Orchestrator)
// File ini hanya menginisialisasi shared namespace dan menyambungkan modul.
// Logika bisnis ada di: js/cart.js, js/product.js, js/report.js

// --- 1. SHARED NAMESPACE & HELPERS ---
window.KasirPro = {
  // Escape HTML untuk mencegah XSS
  escapeHTML(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  },

  // Notifikasi
  tampilNotif(judul, pesan, ikon = "✨") {
    const m = document.getElementById("modalNotif");
    document.getElementById("notifTitle").textContent = judul;
    document.getElementById("notifMessage").textContent = pesan;
    document.getElementById("notifIcon").textContent = ikon;
    m.style.zIndex = "4000";
    m.style.display = "flex";
  },

  // Dark mode
  toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("kasirpro-dark", isDark ? "1" : "0");
    const btn = document.getElementById("btnToggleDark");
    if (btn) btn.textContent = isDark ? "☀️ Mode Terang" : "🌙 Mode Gelap";
  },

  // Pengaturan toko — load dari localStorage
  getTokoConfig() {
    return {
      nama: localStorage.getItem("kasirpro-toko-nama") || "TOKO HANIF",
      alamat: localStorage.getItem("kasirpro-toko-alamat") || "Jl. Dr. AK Ghani, Kel. Tunas Harapan",
      kodePos: localStorage.getItem("kasirpro-toko-kodepos") || "38511",
    };
  },

  saveTokoConfig(nama, alamat, kodePos) {
    localStorage.setItem("kasirpro-toko-nama", nama);
    localStorage.setItem("kasirpro-toko-alamat", alamat);
    localStorage.setItem("kasirpro-toko-kodepos", kodePos);
  },

  // Cached DOM elements (diisi setelah DOM ready)
  el: {},
};

// --- 2. DOM READY: Inisialisasi semua modul ---
document.addEventListener("DOMContentLoaded", () => {
  const K = window.KasirPro;

  // Cache elemen yang sering dipakai
  K.el.searchInput = document.getElementById("searchInput");
  K.el.searchResults = document.getElementById("searchResults");
  K.el.inputBayar = document.getElementById("inputBayar");
  K.el.displayKembali = document.getElementById("displayKembali");

  // --- Init modul ---
  K.cart.initSearch();
  K.product.initProduct();
  K.report.initReport();

  // --- CETAK ---
  document.getElementById("btnProsesCetak").onclick = () => {
    window.print();
    document.getElementById("modalStokPreview").style.display = "none";
  };
  document.getElementById("btnBatalCetak").onclick = () => {
    document.getElementById("modalStokPreview").style.display = "none";
  };

  // --- PEMBAYARAN ---
  document.getElementById("btnBayar").onclick = K.cart.prosesBayar;

  // Quick cash buttons
  document.querySelectorAll(".btn-quick-cash").forEach((btn) => {
    btn.onclick = () => {
      K.el.inputBayar.value = btn.dataset.amount;
      K.cart.hitungKembalian();
    };
  });
  document.getElementById("btnUangPas").onclick = () => {
    K.el.inputBayar.value = K.cart.getKeranjang().reduce((s, i) => s + i.sub, 0);
    K.cart.hitungKembalian();
  };
  K.el.inputBayar.oninput = K.cart.hitungKembalian;

  // --- MODAL SETUP ---
  const setupModal = (btnId, modalId, closeId) => {
    document.getElementById(btnId).onclick = () => {
      const m = document.getElementById(modalId);
      if (btnId === "btnMenuStok") {
        document.getElementById("searchStokInput").value = "";
        K.product.loadStok();
      }
      if (btnId === "btnTambahBarang") {
        document.getElementById("modalProdukTitle").textContent =
          "Tambah Produk";
        document.getElementById("editId").value = "";
        document.getElementById("inNama").value = "";
        document.getElementById("inHarga").value = "";
        document.getElementById("inStok").value = "";
      }
      m.style.zIndex = "2000";
      m.style.display = "flex";
    };
    document.getElementById(closeId).onclick = () =>
      (document.getElementById(modalId).style.display = "none");
  };

  setupModal("btnMenuSetting", "modalSetting", "btnTutupSetting");
  setupModal("btnTambahBarang", "modalProduk", "btnBatalProduk");
  setupModal("btnMenuStok", "modalStok", "closeStokHeader");

  // Close buttons
  document.getElementById("btnTutupLaporan").onclick = () =>
    (document.getElementById("modalLaporan").style.display = "none");
  document.getElementById("btnTutupNotif").onclick = () =>
    (document.getElementById("modalNotif").style.display = "none");
  document.getElementById("btnBatalCart").onclick = K.cart.kosongkanKeranjang;

  // --- RESET DB ---
  document.getElementById("btnResetData").onclick = () => {
    const m = document.getElementById("modalKonfirmasi");
    m.style.zIndex = "3500";
    m.style.display = "flex";
  };
  document.getElementById("btnBatalHapus").onclick = () =>
    (document.getElementById("modalKonfirmasi").style.display = "none");
  document.getElementById("btnProsesHapus").onclick = async () => {
    try {
      await window.api.resetDatabase();
      document.getElementById("modalKonfirmasi").style.display = "none";
      document.getElementById("modalSetting").style.display = "none";
      K.tampilNotif("Sistem Direset", "Database telah dikosongkan.", "🗑️");
    } catch (err) {
      K.tampilNotif("Error", "Gagal mereset database.", "⚠️");
      console.error(err);
    }
  };

  // --- KEYBOARD SHORTCUTS ---
  document.addEventListener("keydown", (e) => {
    // F8 → fokus ke input pembayaran
    if (e.key === "F8") {
      e.preventDefault();
      K.el.inputBayar.focus();
      K.el.inputBayar.select();
    }
    // Enter di input bayar → proses bayar
    if (e.key === "Enter" && document.activeElement === K.el.inputBayar) {
      e.preventDefault();
      K.cart.prosesBayar();
    }
    // Escape → tutup modal teratas
    if (e.key === "Escape") {
      const modals = document.querySelectorAll('.modal[style*="display: flex"]');
      if (modals.length > 0) {
        // Tutup modal dengan z-index tertinggi
        let topModal = null;
        let topZ = 0;
        modals.forEach((m) => {
          const z = parseInt(m.style.zIndex) || 0;
          if (z >= topZ) { topZ = z; topModal = m; }
        });
        if (topModal) topModal.style.display = "none";
      }
    }
  });

  // --- DARK MODE RESTORE ---
  if (localStorage.getItem("kasirpro-dark") === "1") {
    document.body.classList.add("dark-mode");
    const btn = document.getElementById("btnToggleDark");
    if (btn) btn.textContent = "☀️ Mode Terang";
  }
  document.getElementById("btnToggleDark").onclick = K.toggleDarkMode;

  // --- PENGATURAN TOKO ---
  const toko = K.getTokoConfig();
  document.getElementById("inTokoNama").value = toko.nama;
  document.getElementById("inTokoAlamat").value = toko.alamat;
  document.getElementById("inTokoKodePos").value = toko.kodePos;
  document.getElementById("btnSimpanToko").onclick = () => {
    const nama = document.getElementById("inTokoNama").value.trim();
    const alamat = document.getElementById("inTokoAlamat").value.trim();
    const kodePos = document.getElementById("inTokoKodePos").value.trim();
    if (!nama) return K.tampilNotif("Gagal", "Nama toko tidak boleh kosong.", "⚠️");
    K.saveTokoConfig(nama, alamat, kodePos);
    K.tampilNotif("Tersimpan", "Pengaturan toko diperbarui.", "✅");
  };

  // --- CLOCK ---
  setInterval(() => {
    const now = new Date();
    document.getElementById("digitalClock").textContent =
      now.toLocaleTimeString("id-ID");
    document.getElementById("digitalDate").textContent =
      now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
  }, 1000);
});
