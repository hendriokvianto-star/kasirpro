// js/cart.js — Modul Keranjang Belanja & Pembayaran
// Menggunakan window.KasirPro sebagai shared namespace

(function () {
  const K = window.KasirPro;

  // --- STATE ---
  let keranjang = [];

  // --- KERANJANG ---
  function getKeranjang() {
    return keranjang;
  }

  function tambahKeKeranjang(produk) {
    const i = keranjang.findIndex((item) => item.id === produk.id);
    if (i > -1) {
      keranjang[i].qty++;
      keranjang[i].sub = keranjang[i].qty * keranjang[i].harga;
    } else {
      keranjang.push({
        id: produk.id,
        nama: produk.nama,
        harga: produk.harga,
        qty: 1,
        sub: produk.harga,
      });
    }
    renderCart();
  }

  function kosongkanKeranjang() {
    keranjang = [];
    renderCart();
  }

  function hitungKembalian() {
    const total = keranjang.reduce((s, i) => s + i.sub, 0);
    const bayar = parseFloat(K.el.inputBayar.value) || 0;
    const kembali = bayar - total;
    K.el.displayKembali.textContent = `Rp ${(kembali >= 0 ? kembali : 0).toLocaleString("id-ID")}`;
    K.el.displayKembali.style.color = kembali >= 0 ? "#10b981" : "#ef4444";
  }

  function renderCart() {
    const tbody = document.querySelector("#cartTable tbody");
    tbody.innerHTML = "";
    let total = 0;

    // Empty state
    if (keranjang.length === 0) {
      const tr = tbody.insertRow();
      const td = tr.insertCell();
      td.colSpan = 5;
      td.style.cssText = "text-align:center; padding:3rem 1rem; color:var(--teks-terang);";
      td.innerHTML = '<div style="font-size:2.5rem; margin-bottom:0.5rem">🛒</div>' +
        '<div style="font-weight:600">Keranjang kosong</div>' +
        '<div style="font-size:0.8rem; margin-top:4px">Cari dan tambahkan barang di kolom pencarian</div>';
      document.getElementById("grandTotalDisplay").textContent = "Rp 0";
      hitungKembalian();
      return;
    }

    keranjang.forEach((item, idx) => {
      const tr = tbody.insertRow();

      const tdNama = tr.insertCell();
      tdNama.textContent = item.nama;

      const tdHarga = tr.insertCell();
      tdHarga.textContent = item.harga.toLocaleString();

      const tdQty = tr.insertCell();
      const inputQty = document.createElement("input");
      inputQty.type = "number";
      inputQty.value = item.qty;
      inputQty.style.width = "50px";
      inputQty.onchange = (e) => {
        keranjang[idx].qty = Math.max(1, parseInt(e.target.value) || 1);
        keranjang[idx].sub = keranjang[idx].qty * keranjang[idx].harga;
        renderCart();
      };
      tdQty.appendChild(inputQty);

      const tdTotal = tr.insertCell();
      tdTotal.textContent = `Rp ${item.sub.toLocaleString()}`;

      const tdHapus = tr.insertCell();
      const btnHapus = document.createElement("button");
      btnHapus.style.cssText =
        "color:red; border:none; background:none; cursor:pointer";
      btnHapus.textContent = "✕";
      btnHapus.onclick = () => {
        keranjang.splice(idx, 1);
        renderCart();
      };
      tdHapus.appendChild(btnHapus);

      total += item.sub;
    });
    document.getElementById("grandTotalDisplay").textContent =
      `Rp ${total.toLocaleString()}`;
    hitungKembalian();
  }

  // --- PEMBAYARAN ---
  async function prosesBayar() {
    const total = keranjang.reduce((s, i) => s + i.sub, 0);
    const bayar = parseFloat(K.el.inputBayar.value) || 0;

    if (keranjang.length === 0 || bayar < total) {
      return K.tampilNotif("Gagal", "Uang tidak cukup!", "⚠️");
    }

    const dataStruk = {
      total: total,
      bayar: bayar,
      kembali: bayar - total,
      items: [...keranjang],
    };

    try {
      await window.api.prosesTransaksi({
        total: total,
        items: keranjang.map((i) => ({
          id: i.id,
          nama: i.nama,
          harga: i.harga,
          qty: i.qty,
          subtotal: i.sub,
        })),
      });

      K.tampilNotif(
        "Berhasil",
        `Transaksi Selesai. Kembali: Rp ${dataStruk.kembali.toLocaleString()}`,
        "💰",
      );

      tunjukkanPreviewStruk(dataStruk);

      keranjang = [];
      K.el.inputBayar.value = "";
      renderCart();
    } catch (err) {
      K.tampilNotif("Error", "Gagal memproses transaksi.", "⚠️");
      console.error(err);
    }
  }

  // --- CETAK STRUK ---
  function generateStrukHTML(dataTransaksi) {
    const { total, bayar, kembali, items } = dataTransaksi;
    const tgl = new Date().toLocaleString("id-ID");
    const toko = K.getTokoConfig();

    let itemRows = "";
    items.forEach((it) => {
      itemRows += `
        <div style="display:flex; justify-content:space-between">
          <span>${K.escapeHTML(it.nama)} x${K.escapeHTML(it.qty)}</span>
          <span>${it.sub.toLocaleString()}</span>
        </div>
      `;
    });

    return `
      <div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:10px; margin-bottom:10px;">
        <strong style="font-size:16px">${K.escapeHTML(toko.nama)}</strong><br>
        ${K.escapeHTML(toko.alamat)}<br>
        Kode Pos : ${K.escapeHTML(toko.kodePos)}
      </div>
      <div style="font-size:11px; margin-bottom:10px;">
        Tgl: ${K.escapeHTML(tgl)}<br>
        Kasir: Admin
      </div>
      <div style="border-bottom:1px dashed #000; padding-bottom:10px; margin-bottom:10px;">
        ${itemRows}
      </div>
      <div style="display:flex; justify-content:space-between; font-weight:bold">
        <span>TOTAL</span>
        <span>Rp ${total.toLocaleString()}</span>
      </div>
      <div style="display:flex; justify-content:space-between">
        <span>BAYAR</span>
        <span>Rp ${bayar.toLocaleString()}</span>
      </div>
      <div style="display:flex; justify-content:space-between">
        <span>KEMBALIAN</span>
        <span>Rp ${kembali.toLocaleString()}</span>
      </div>
      <div style="text-align:center; margin-top:20px; font-size:10px">
        Terima Kasih Atas Kunjungan Anda!
      </div>
    `;
  }

  function tunjukkanPreviewStruk(data) {
    const modal = document.getElementById("modalStokPreview");
    const area = document.getElementById("previewArea");
    area.innerHTML = generateStrukHTML(data);
    modal.style.zIndex = "3000";
    modal.style.display = "flex";
  }

  // --- SEARCH PRODUK ---
  function initSearch() {
    const searchInput = K.el.searchInput;
    const searchResults = K.el.searchResults;

    searchInput.addEventListener("input", async (e) => {
      const val = e.target.value;
      if (val.length < 1) {
        searchResults.style.display = "none";
        return;
      }
      try {
        const rows = await window.api.searchProduk(val);
        searchResults.innerHTML = "";
        rows.forEach((row) => {
          const div = document.createElement("div");
          div.className = "result-item";

          const infoDiv = document.createElement("div");
          const namaDiv = document.createElement("div");
          namaDiv.style.fontWeight = "700";
          namaDiv.textContent = row.nama;
          const detailSmall = document.createElement("small");
          detailSmall.textContent = `ID: #${row.id} | Stok: ${row.stok}`;
          infoDiv.appendChild(namaDiv);
          infoDiv.appendChild(detailSmall);

          const hargaDiv = document.createElement("div");
          hargaDiv.style.cssText =
            "background:#eef2ff; color:#6366f1; padding:10px 12px; border-radius:10px; font-weight:800;";
          hargaDiv.textContent = `Rp ${row.harga.toLocaleString()}`;

          div.appendChild(infoDiv);
          div.appendChild(hargaDiv);

          div.onclick = () => {
            tambahKeKeranjang(row);
            searchResults.style.display = "none";
            searchInput.value = "";
            searchInput.focus();
          };
          searchResults.appendChild(div);
        });
        searchResults.style.display = "block";
      } catch (err) {
        console.error("Gagal mencari produk:", err);
      }
    });
  }

  // --- EXPORT ---
  K.cart = {
    getKeranjang,
    tambahKeKeranjang,
    kosongkanKeranjang,
    hitungKembalian,
    renderCart,
    prosesBayar,
    tunjukkanPreviewStruk,
    initSearch,
  };
})();
