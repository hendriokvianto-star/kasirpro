// js/product.js — Modul Manajemen Produk & Stok
// Menggunakan window.KasirPro sebagai shared namespace

(function () {
  const K = window.KasirPro;

  // --- LOAD STOK ---
  async function loadStok(keyword = "") {
    try {
      const rows = await window.api.getAllProduk(keyword);
      const tb = document.querySelector("#stokTable tbody");
      if (!tb) return;
      tb.innerHTML = "";
      rows.forEach((r) => {
        let badgeClass, badgeText;
        if (r.stok <= 0) {
          badgeClass = "badge-bahaya";
          badgeText = "Habis";
        } else if (r.stok <= 10) {
          badgeClass = "badge-warning";
          badgeText = `Sisa ${r.stok}`;
        } else {
          badgeClass = "badge-sukses";
          badgeText = `Ada (${r.stok})`;
        }

        const tr = tb.insertRow();

        // Kolom Produk
        const tdNama = tr.insertCell();
        const bNama = document.createElement("b");
        bNama.textContent = r.nama;
        const brEl = document.createElement("br");
        const smallId = document.createElement("small");
        smallId.style.color = "gray";
        smallId.textContent = `ID: #${r.id}`;
        tdNama.appendChild(bNama);
        tdNama.appendChild(brEl);
        tdNama.appendChild(smallId);

        // Kolom Harga
        const tdHarga = tr.insertCell();
        tdHarga.textContent = `Rp ${r.harga.toLocaleString()}`;

        // Kolom Status
        const tdStatus = tr.insertCell();
        const badge = document.createElement("span");
        badge.className = `badge ${badgeClass}`;
        badge.textContent = badgeText;
        tdStatus.appendChild(badge);

        // Kolom Aksi
        const tdAksi = tr.insertCell();

        const btnEdit = document.createElement("button");
        btnEdit.className = "btn-edit-item";
        btnEdit.style.cssText =
          "cursor:pointer; border:none; background:#f1f5f9; padding:5px 10px; border-radius:8px;";
        btnEdit.textContent = "✏️";
        btnEdit.onclick = () => {
          const modalForm = document.getElementById("modalProduk");
          document.getElementById("modalProdukTitle").textContent =
            "Edit Produk";
          document.getElementById("editId").value = r.id;
          document.getElementById("inNama").value = r.nama;
          document.getElementById("inHarga").value = r.harga;
          document.getElementById("inStok").value = r.stok;
          modalForm.style.zIndex = "2500";
          modalForm.style.display = "flex";
        };

        const btnDel = document.createElement("button");
        btnDel.className = "btn-del-item";
        btnDel.style.cssText =
          "cursor:pointer; border:none; background:#f1f5f9; padding:5px 10px; border-radius:8px; color:red;";
        btnDel.textContent = "🗑️";
        btnDel.onclick = async () => {
          await window.api.deleteProduk(r.id);
          loadStok(document.getElementById("searchStokInput").value);
          K.tampilNotif("Dihapus", `${r.nama} telah dihapus.`, "🗑️");
        };

        tdAksi.appendChild(btnEdit);
        tdAksi.appendChild(document.createTextNode(" "));
        tdAksi.appendChild(btnDel);
      });
    } catch (err) {
      console.error("Gagal memuat stok:", err);
    }
  }

  // --- SIMPAN PRODUK (INSERT / UPDATE) ---
  async function simpanProduk() {
    const id = document.getElementById("editId").value;
    const n = document.getElementById("inNama").value;
    const h = parseFloat(document.getElementById("inHarga").value);
    const s = parseInt(document.getElementById("inStok").value);
    if (!n || isNaN(h))
      return K.tampilNotif("Gagal", "Data belum lengkap!", "⚠️");

    try {
      if (id) {
        await window.api.updateProduk({ id, nama: n, harga: h, stok: s });
        document.getElementById("modalProduk").style.display = "none";
        loadStok(document.getElementById("searchStokInput").value);
        K.tampilNotif("Berhasil", "Produk diperbarui.", "✅");
      } else {
        await window.api.insertProduk({ nama: n, harga: h, stok: s });
        document.getElementById("modalProduk").style.display = "none";
        loadStok(document.getElementById("searchStokInput").value);
        K.tampilNotif("Tersimpan", "Produk baru ditambah.", "📦");
      }
    } catch (err) {
      K.tampilNotif("Error", "Gagal menyimpan produk.", "⚠️");
      console.error(err);
    }
  }

  // --- INIT ---
  function initProduct() {
    document
      .getElementById("searchStokInput")
      .addEventListener("input", (e) => loadStok(e.target.value));

    document.getElementById("btnSimpanBarang").onclick = simpanProduk;
  }

  // --- EXPORT ---
  K.product = {
    loadStok,
    simpanProduk,
    initProduct,
  };
})();
