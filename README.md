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

## Key Architecture & Implementation Details

### 1. Backend Architecture (`src-tauri/src/`)
- **`models.rs`**: Domain data models (`Emulator`, `Release`, `InstallProgress`, `AppConfig`) and version resolution (`resolve_release_version`) with comprehensive unit tests.
- **`emulator.rs`**: Fetches emulator lists and resolves versions from both GitHub API and external custom APIs (Eden Forgejo, Dolphin dev endpoint).
- **`installer.rs`**: Downloads archives, extracts (`.zip`, `.7z`, `.tar.gz`, `.tar.xz`), flattens nested single directories (`flatten_single_directory`), handles companion downloads (e.g. 86Box for Avalonia86), and applies portable markers.
- **`config.rs`**: Settings persistence (install directory, GitHub API tokens).
- **`lib.rs`**: Tauri entrypoint and IPC command registration.

### 2. Custom Sources & Token Scoping
- Custom source endpoints (e.g., Eden Forgejo, Dolphin API) do **not** receive GitHub Personal Access Tokens in `Authorization` headers. `is_github_url()` strictly scopes tokens to `github.com` and `api.github.com` to prevent `401 Unauthorized` responses.
- `list_emulators` embeds `emulators.json` via `include_str!` as an immutable fallback to guarantee zero startup failures in dev or production packages.

### 3. Portable Mode Engine
- Emulators declare their portable strategy in `src-tauri/emulators.json`:
  - `"folder"`: Creates a subdirectory (e.g., `user/`, `portable/`).
  - `"file"`: Touches or writes a configuration marker (e.g., `portable.txt`, `portable.ini`, `installed.txt`).
- Enabled by default in the download modal.

---

## Development & Build Commands

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (1.77+ recommended)
- [Tauri CLI](https://v2.tauri.app/)

### Running the App
```bash
# Start frontend and backend concurrently with hot reloading
npm run tauri dev
```

### Verification & Testing
```bash
# Run backend Rust unit tests
cd src-tauri
cargo test

# Type-check and build frontend
npm run build
```

---

## Session Handoff Notes
- All 9 Rust unit tests pass (`cargo test`).
- TypeScript and Vite client build cleanly (`npm run build`).
- Host-aware auth scoping (`is_github_url`) and flexible Forgejo array/object release parsing are operational.
- Next areas for potential extension:
  - Linux/macOS specific testing and path validation.
  - Adding emulator launch/run buttons with executable path discovery.
  - Auto-update check interval or background refresh.
