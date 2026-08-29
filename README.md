# Emulator Downloader

A cross-platform desktop application built with **Tauri v2**, **Rust**, and **React + TypeScript + Tailwind CSS** to discover, download, install, and update game emulators with automatic portable-mode configuration.

---

## Supported Emulators

| Emulator | Target System | Source Provider | Special Handling / Notes |
| :--- | :--- | :--- | :--- |
| **Avalonia86** | PC / x86 | GitHub Releases | Auto-downloads & bundles `86Box` binary inside `<avalonia86>/86box/` |
| **PCSX2** | PS2 | GitHub Releases | Nightly / stable artifact filtering; portable folder `portable.ini` |
| **DuckStation** | PS1 | GitHub Releases | Rolling preview commit-hash resolution & portable folder setup |
| **RPCS3** | PS3 | GitHub Releases (`rpcs3-binaries-win` / `-linux`) | Resolves version from release name/asset tag; portable `portable.txt` |
| **Dolphin** | GameCube / Wii | Custom API (`dolphin-emu.org/update/latest/dev/`) | Dev channel live API with dynamic artifact resolution & root flattening |
| **PPSSPP** | PSP | GitHub Releases | Portable `installed.txt` marker |
| **shadPS4** | PS4 | GitHub Releases (`shadps4-emu/shadps4-qtlauncher`) | Pre-release fallback resolution; portable `user` folder |
| **Xemu** | Original Xbox | GitHub Releases | Portable `xemu.ini` setup |
| **Eden** | Nintendo Switch | Forgejo API (`git.eden-emu.dev/api/v1/...`) | PGO-optimized build selection, custom release parser, portable `user` dir |

---

