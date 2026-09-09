// js/auth.js — Modul Autentikasi Pengguna & Sesi KasirPro
// Menggunakan window.KasirPro sebagai shared namespace

(function () {
  const K = window.KasirPro;

  // --- STATE ---
  let currentUser = null;

  function getCurrentUser() {
    return currentUser;
  }

  function applyUserState(user) {
    currentUser = user;
    const overlay = document.getElementById("loginOverlay");
    const nameEl = document.getElementById("activeUserName");
    const roleEl = document.getElementById("activeUserRole");

    if (user) {
      if (overlay) overlay.style.display = "none";
      if (nameEl) nameEl.textContent = user.nama_lengkap || user.username;
      if (roleEl) roleEl.textContent = (user.role || "kasir").toUpperCase();
      sessionStorage.setItem("kasirpro-user", JSON.stringify(user));
      const search = document.getElementById("searchInput");
      if (search) search.focus();
    } else {
      sessionStorage.removeItem("kasirpro-user");
      if (overlay) {
        overlay.style.display = "flex";
        const userIn = document.getElementById("loginUsername");
        if (userIn) {
          userIn.focus();
          userIn.select();
        }
      }
      if (K.cart && typeof K.cart.kosongkanKeranjang === "function") {
        K.cart.kosongkanKeranjang();
      }
    }
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    const userIn = document.getElementById("loginUsername");
    const passIn = document.getElementById("loginPassword");
    const errEl = document.getElementById("loginErrorMsg");
    const btnSubmit = document.getElementById("loginBtnSubmit");

    const username = userIn.value.trim();
    const password = passIn.value;

    if (!username || !password) {
      if (errEl) {
        errEl.textContent = "Username dan password wajib diisi.";
        errEl.style.display = "block";
      }
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Memverifikasi...";
    }
    if (errEl) errEl.style.display = "none";

    try {
      const res = await window.api.login({ username, password });
      if (res && res.success) {
        passIn.value = "";
        if (errEl) errEl.style.display = "none";
        applyUserState(res.user);
        K.tampilNotif("Login Berhasil", `Selamat datang, ${res.user.nama_lengkap}!`, "👋");
      } else {
        if (errEl) {
          errEl.textContent = res.message || "Username atau password salah.";
          errEl.style.display = "block";
        }
        passIn.value = "";
        passIn.focus();
      }
    } catch (err) {
      console.error("Gagal login:", err);
      if (errEl) {
        errEl.textContent = "Terjadi kesalahan sistem saat login.";
        errEl.style.display = "block";
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Masuk ke Sistem";
      }
    }
  }

  function handleLogout() {
    applyUserState(null);
    K.tampilNotif("Logout", "Sesi telah berakhir.", "🔒");
  }

  async function handleGantiPassword() {
    if (!currentUser) return;
    const lama = document.getElementById("inPassLama").value;
    const baru = document.getElementById("inPassBaru").value;
    const konf = document.getElementById("inPassKonfirmasi").value;

    if (!lama || !baru) {
      return K.tampilNotif("Gagal", "Password lama dan baru wajib diisi.", "⚠️");
    }
    if (baru.length < 5) {
      return K.tampilNotif("Gagal", "Password baru minimal 5 karakter.", "⚠️");
    }
    if (baru !== konf) {
      return K.tampilNotif("Gagal", "Konfirmasi password baru tidak cocok.", "⚠️");
    }

    try {
      const res = await window.api.gantiPassword({
        id: currentUser.id,
        passwordLama: lama,
        passwordBaru: baru,
      });

      if (res && res.success) {
        document.getElementById("inPassLama").value = "";
        document.getElementById("inPassBaru").value = "";
        document.getElementById("inPassKonfirmasi").value = "";
        K.tampilNotif("Berhasil", res.message, "🔑");
      } else {
        K.tampilNotif("Gagal", res.message || "Gagal mengubah password.", "⚠️");
      }
    } catch (err) {
      console.error("Gagal ganti password:", err);
      K.tampilNotif("Error", "Gagal memperbarui password.", "⚠️");
    }
  }

  function initAuth() {
    const form = document.getElementById("formLogin");
    if (form) form.onsubmit = handleLogin;

    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) btnLogout.onclick = handleLogout;

    const btnGantiPass = document.getElementById("btnSimpanPassword");
    if (btnGantiPass) btnGantiPass.onclick = handleGantiPassword;

    // Toggle lihat password login
    const btnToggleShowPass = document.getElementById("btnToggleShowPass");
    if (btnToggleShowPass) {
      btnToggleShowPass.onclick = () => {
        const passIn = document.getElementById("loginPassword");
        if (passIn.type === "password") {
          passIn.type = "text";
          btnToggleShowPass.textContent = "🙈";
        } else {
          passIn.type = "password";
          btnToggleShowPass.textContent = "👁️";
        }
      };
    }

    // Cek sesi yang ada di sessionStorage
    const saved = sessionStorage.getItem("kasirpro-user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          applyUserState(parsed);
          return;
        }
      } catch (_e) {
        sessionStorage.removeItem("kasirpro-user");
      }
    }

    // Jika belum login, tampilkan layar login
    applyUserState(null);
  }

  // --- EXPORT ---
  K.auth = {
    getCurrentUser,
    handleLogin,
    handleLogout,
    initAuth,
  };
})();
