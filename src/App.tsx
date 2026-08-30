import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Page, Emulator, UpdateInfo, InstallStatus, ProgressPayload, ReleaseChannel } from "./types";
import {
  getEffectiveAssetPattern,
  getEffectiveCustomSource,
  getEffectiveOwner,
  getEffectiveRepo,
  getDefaultChannel,
} from "./utils";
import Sidebar from "./components/Sidebar";
import EmulatorsPage from "./pages/EmulatorsPage";
import UpdatesPage from "./pages/UpdatesPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const [page, setPage] = useState<Page>("emulators");
  const [defaultPath, setDefaultPath] = useState("");
  const [emulators, setEmulators] = useState<Emulator[]>([]);
  const [updates, setUpdates] = useState<UpdateInfo[] | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("emuvault_theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("emuvault_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    invoke<string>("load_default_path").then(setDefaultPath);
    invoke<Emulator[]>("list_emulators").then(setEmulators).catch(console.error);
  }, []);

  useEffect(() => {
    const unlisten = listen<ProgressPayload>("install-progress", (event) => {
      setUpdates((prev) =>
        prev
          ? prev.map((u) =>
              u.updating
                ? { ...u, step: event.payload.status, percent: Math.round(event.payload.progress) }
                : u
            )
          : prev
      );
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const savePath = (path: string) => {
    setDefaultPath(path);
    invoke("save_default_path", { path });
  };

  const checkForUpdates = useCallback(async () => {
    if (checkingUpdates || emulators.length === 0) return;
    setCheckingUpdates(true);

    const results: UpdateInfo[] = [];

    await Promise.all(
      emulators.map(async (emu) => {
        try {
          const status = await invoke<InstallStatus>("check_install_status", { emulatorId: emu.id });
          if (!status.installed || !status.version) return;

          const channel: ReleaseChannel =
            status.channel === "nightly" || status.channel === "stable"
              ? status.channel
              : getDefaultChannel(emu);

          const latest = await invoke<string>("get_latest_version", {
            owner: getEffectiveOwner(emu, channel),
            repo: getEffectiveRepo(emu, channel),
            customSource: getEffectiveCustomSource(emu, channel),
            channel,
          });

          if (latest && latest !== "unknown" && latest !== status.version) {
            results.push({
              emulator: emu,
              channel,
              installedVersion: status.version,
              latestVersion: latest,
              updating: false,
              done: false,
              percent: 0,
              step: "",
            });
          }
        } catch {
          // ignore network or parse error for individual emulator
        }
      })
    );

    setUpdates(results);
    setCheckingUpdates(false);
  }, [checkingUpdates, emulators]);

  useEffect(() => {
    if (emulators.length > 0 && updates === null && !checkingUpdates) {
      checkForUpdates();
    }
  }, [emulators, updates, checkingUpdates, checkForUpdates]);

  const handleUpdate = async (index: number) => {
    if (!updates) return;
    const u = updates[index];
    const installPath = await invoke<string>("get_emulator_path", { emulatorId: u.emulator.id });
    const currentStatus = await invoke<InstallStatus>("check_install_status", { emulatorId: u.emulator.id }).catch(() => null);
    const isPortable = currentStatus?.is_portable ?? true;

    setUpdates((prev) =>
      prev
        ? prev.map((x, i) => (i === index ? { ...x, updating: true, step: "Connecting...", percent: 5 } : x))
        : prev
    );

    try {
      await invoke("download_and_install", {
        owner: getEffectiveOwner(u.emulator, u.channel),
        repo: getEffectiveRepo(u.emulator, u.channel),
        assetPattern: getEffectiveAssetPattern(u.emulator, u.channel),
        installPath,
        emulatorId: u.emulator.id,
        customSource: getEffectiveCustomSource(u.emulator, u.channel),
        channel: u.channel,
        portable: isPortable,
        portableType: u.emulator.portable_type ?? null,
        portableTarget: u.emulator.portable_target ?? null,
      });

      setUpdates((prev) =>
        prev
          ? prev.map((x, i) =>
              i === index ? { ...x, updating: false, done: true, percent: 100, step: "Complete!" } : x
            )
          : prev
      );
    } catch {
      setUpdates((prev) =>
        prev
          ? prev.map((x, i) =>
              i === index ? { ...x, updating: false, step: "Failed to update", percent: 0 } : x
            )
          : prev
      );
    }
  };

  const handleUpdateAll = async () => {
    if (!updates) return;
    for (let i = 0; i < updates.length; i++) {
      if (!updates[i].done) {
        await handleUpdate(i);
      }
    }
  };

  const pendingUpdateCount = updates ? updates.filter((u) => !u.done).length : 0;

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden font-sans select-none antialiased transition-colors">
      <Sidebar
        page={page}
        setPage={setPage}
        updateCount={pendingUpdateCount}
        checkingUpdates={checkingUpdates}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="flex flex-col flex-1 overflow-hidden">
        {page === "emulators" && (
          <EmulatorsPage
            emulators={emulators}
            defaultPath={defaultPath}
          />
        )}
        {page === "updates" && (
          <UpdatesPage
            updates={updates}
            checking={checkingUpdates}
            onCheck={checkForUpdates}
            onUpdate={handleUpdate}
            onUpdateAll={handleUpdateAll}
          />
        )}
        {page === "settings" && (
          <SettingsPage
            defaultPath={defaultPath}
            savePath={savePath}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
      </main>
    </div>
  );
}
