module.exports = {
  packagerConfig: {
    asar: true,
    name: "KasirPro",
    icon: "./assets/icon", // Jangan tuliskan .ico, Forge akan mencarinya otomatis
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        // Biarkan kosong atau samakan dengan packagerConfig.name
        authors: "Hendri O",
        description: "Aplikasi Kasir JS",
        setupExe: "Instal-Kasir-JS.exe",
        setupIcon: "./assets/icon.ico", // Pastikan kamu punya file .ico di folder assets
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],
};
