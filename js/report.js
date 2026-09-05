// js/report.js — Modul Laporan & Ekspor CSV
// Menggunakan window.KasirPro sebagai shared namespace

(function () {
  const K = window.KasirPro;

  // --- LOAD LAPORAN ---
  async function loadLaporan(tglAwal = null, tglAkhir = null) {
    try {
      const data = await window.api.getLaporan({ tglAwal, tglAkhir });

      document.getElementById("labelOmzetHariIni").textContent = data.isFiltered
        ? "OMZET PERIODE INI"
        : "OMZET HARI INI";
      document.getElementById("omzetHariIni").textContent =
        `Rp ${data.omzet.toLocaleString()}`;
      document.getElementById("totalTransaksiCount").textContent = data.count;

      const omzetBulan = await window.api.getOmzetBulan();
      document.getElementById("omzetBulanIni").textContent =
        `Rp ${omzetBulan.toLocaleString()}`;

      // Render riwayat
      const tb = document.querySelector("#riwayatTable tbody");
      tb.innerHTML = "";
      data.riwayat.forEach((r) => {
        const tr = tb.insertRow();

        const tdWaktu = tr.insertCell();
        tdWaktu.textContent = r.waktu;

        const tdTotal = tr.insertCell();
        const b = document.createElement("b");
        b.textContent = `Rp ${r.total.toLocaleString()}`;
        tdTotal.appendChild(b);

        // Kolom Detail — tombol lihat item
        const tdDetail = tr.insertCell();
        const btnDetail = document.createElement("button");
        btnDetail.style.cssText =
          "border:none; background:#eef2ff; color:#6366f1; padding:4px 10px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.75rem;";
        btnDetail.textContent = "Detail";
        btnDetail.onclick = () => loadDetailTransaksi(r.id);
        tdDetail.appendChild(btnDetail);
      });
    } catch (err) {
      console.error("Gagal memuat laporan:", err);
    }
  }

  // --- DETAIL TRANSAKSI ---
  async function loadDetailTransaksi(transaksiId) {
    try {
      const items = await window.api.getDetailTransaksi(transaksiId);
      const modal = document.getElementById("modalDetailTransaksi");
      const tbody = document.querySelector("#detailTransaksiTable tbody");
      tbody.innerHTML = "";

      items.forEach((item) => {
        const tr = tbody.insertRow();

        const tdNama = tr.insertCell();
        tdNama.textContent = item.nama_produk;

        const tdHarga = tr.insertCell();
        tdHarga.textContent = `Rp ${item.harga_satuan.toLocaleString()}`;

        const tdQty = tr.insertCell();
        tdQty.textContent = item.jumlah;

        const tdSub = tr.insertCell();
        const b = document.createElement("b");
        b.textContent = `Rp ${item.subtotal.toLocaleString()}`;
        tdSub.appendChild(b);
      });

      modal.style.zIndex = "3500";
      modal.style.display = "flex";
    } catch (err) {
      K.tampilNotif("Error", "Gagal memuat detail transaksi.", "⚠️");
      console.error(err);
    }
  }

  // --- EKSPOR CSV ---
  async function eksporCSV() {
    const tglAwal = document.getElementById("filterTglAwal").value;
    const tglAkhir = document.getElementById("filterTglAkhir").value;

    try {
      const result = await window.api.eksporCSV({
        tglAwal: tglAwal || null,
        tglAkhir: tglAkhir || null,
      });

      if (result.success) {
        K.tampilNotif("Berhasil", result.message, "📁");
      } else {
        K.tampilNotif("Info", result.message, "ℹ️");
      }
    } catch (err) {
      K.tampilNotif("Error", "Gagal mengekspor laporan.", "⚠️");
      console.error(err);
    }
  }

  // --- INIT ---
  function initReport() {
    document.getElementById("btnMenuLaporan").onclick = () => {
      document.getElementById("filterTglAwal").value = "";
      document.getElementById("filterTglAkhir").value = "";
      loadLaporan();
      document.getElementById("modalLaporan").style.zIndex = "2000";
      document.getElementById("modalLaporan").style.display = "flex";
    };

    document.getElementById("btnFilterLaporan").onclick = () => {
      const tglAwal = document.getElementById("filterTglAwal").value;
      const tglAkhir = document.getElementById("filterTglAkhir").value;
      if (tglAwal && tglAkhir) {
        loadLaporan(tglAwal, tglAkhir);
      } else {
        K.tampilNotif(
          "Peringatan",
          "Silakan pilih tanggal awal dan akhir untuk memfilter.",
          "⚠️",
        );
      }
    };

    document.getElementById("btnResetFilter").onclick = () => {
      document.getElementById("filterTglAwal").value = "";
      document.getElementById("filterTglAkhir").value = "";
      loadLaporan();
    };

    document.getElementById("btnEksporLaporan").onclick = eksporCSV;

    document.getElementById("btnTutupDetailTransaksi").onclick = () =>
      (document.getElementById("modalDetailTransaksi").style.display = "none");
  }

  // --- EXPORT ---
  K.report = {
    loadLaporan,
    loadDetailTransaksi,
    eksporCSV,
    initReport,
  };
})();
