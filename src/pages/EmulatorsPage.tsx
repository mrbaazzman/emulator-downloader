import { useEffect, useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Emulator, InstallStatus } from "../types";
import InstallModal from "../components/InstallModal";
import EmulatorIcon from "../components/EmulatorIcon";
import {
  Search,
  X,
  Play,
  FolderOpen,
  Trash2,
  Download,
  RefreshCw,
  Folder,
  AlertCircle,
} from "lucide-react";

interface EmulatorsPageProps {
  emulators: Emulator[];
  defaultPath: string;
}

type FilterType = "all" | "installed" | "available";

export default function EmulatorsPage({ emulators, defaultPath }: EmulatorsPageProps) {
  const [statuses, setStatuses] = useState<Record<string, InstallStatus>>({});
  const [selected, setSelected] = useState<Emulator | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Emulator | null>(null);
  const [confirmDeletePath, setConfirmDeletePath] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatuses = useCallback(async () => {
    if (emulators.length === 0) return;
    setRefreshing(true);
    const results = await Promise.all(
      emulators.map(async (emu) => {
        const status = await invoke<InstallStatus>("check_install_status", { emulatorId: emu.id }).catch(() => ({
          installed: false,
          version: null,
          is_portable: false,
        }));
        return [emu.id, status] as const;
      })
    );
    setStatuses(Object.fromEntries(results));
    setRefreshing(false);
  }, [emulators]);

  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses, defaultPath]);

  const handleLaunch = async (emu: Emulator) => {
    await invoke("launch_emulator", { emulatorId: emu.id }).catch(console.error);
  };

  const handleUninstall = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await invoke("remove_emulator", { emulatorId: confirmDelete.id }).catch(console.error);
    setDeleting(false);
    setConfirmDelete(null);
    setConfirmDeletePath("");
    refreshStatuses();
  };

  const handleOpenFolder = async (emu: Emulator) => {
    const path = await invoke<string>("get_emulator_path", { emulatorId: emu.id });
    invoke("open_folder", { path });
  };

  const handleOpenDefaultFolder = () => {
    if (defaultPath) {
      invoke("open_folder", { path: defaultPath });
    }
  };

  // Counts
  const installedCount = useMemo(
    () => emulators.filter((e) => statuses[e.id]?.installed).length,
    [emulators, statuses]
  );
  const availableCount = emulators.length - installedCount;

  // Filtered Emulators
  const filteredEmulators = useMemo(() => {
    return emulators.filter((emu) => {
      const isInstalled = !!statuses[emu.id]?.installed;
      if (filter === "installed" && !isInstalled) return false;
      if (filter === "available" && isInstalled) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        emu.name.toLowerCase().includes(q) ||
        emu.description.toLowerCase().includes(q) ||
        emu.id.toLowerCase().includes(q)
      );
    });
  }, [emulators, statuses, filter, searchQuery]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-950 transition-colors">
      {/* Top Header & Search Bar */}
      <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emulators or systems (e.g. Switch, PS2, Dolphin)..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl pl-10 pr-9 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Segmented Filter Pills */}
          <div className="flex items-center bg-neutral-200/70 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl p-1 text-sm font-medium">
            <button
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                filter === "all"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              All ({emulators.length})
            </button>
            <button
              onClick={() => setFilter("installed")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                filter === "installed"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              Installed ({installedCount})
            </button>
            <button
              onClick={() => setFilter("available")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                filter === "available"
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              Available ({availableCount})
            </button>
          </div>

          <button
            onClick={handleOpenDefaultFolder}
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl shadow-xs transition-colors"
            title={`Open Root Folder: ${defaultPath}`}
          >
            <Folder className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={refreshStatuses}
            disabled={refreshing}
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${refreshing ? "animate-spin text-violet-600 dark:text-violet-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {filteredEmulators.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-center">
            <AlertCircle className="w-10 h-10 text-neutral-400 dark:text-neutral-600 mb-3" />
            <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">No emulators found</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm">
              {searchQuery
                ? `No emulators match "${searchQuery}". Try searching for another console or clear the search query.`
                : "No emulators match the selected filter."}
            </p>
            {(searchQuery || filter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilter("all");
                }}
                className="mt-4 px-4 py-2 text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
            {filteredEmulators.map((emu) => {
              const status = statuses[emu.id];
              const isInstalled = !!status?.installed;

              return (
                <div
                  key={emu.id}
                  className={`border rounded-2xl p-5 lg:p-6 flex flex-col justify-between transition-all duration-150 shadow-xs hover:shadow-md ${
                    isInstalled
                      ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                      : "bg-white/70 dark:bg-neutral-900/50 border-neutral-200/90 dark:border-neutral-800/80"
                  }`}
                >
                  <div>
                    {/* Card Header: Logo, Name, Console Subtitle, Status Badges */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <EmulatorIcon id={emu.id} className="w-11 h-11 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                              {emu.name}
                            </h3>
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                              {emu.description}
                            </p>
                          </div>

                          {/* Primary Status Badge */}
                          <div className="shrink-0">
                            {isInstalled ? (
                              <span
                                className="text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-lg font-mono font-semibold flex items-center gap-1.5 max-w-[150px]"
                                title={status.version ?? "Installed"}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="truncate">{status.version ?? "Installed"}</span>
                              </span>
                            ) : (
                              <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-2.5 py-0.5 rounded-lg font-medium">
                                Ready
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meta Tags Row: Channel + Portable */}
                        {isInstalled && (status.channel || status.is_portable) && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {status.channel && (
                              <span className="text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-md font-mono font-medium capitalize">
                                {status.channel}
                              </span>
                            )}
                            {status.is_portable && (
                              <span className="text-[11px] bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 px-2 py-0.5 rounded-md font-mono font-medium">
                                Portable
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Action Controls */}
                  <div className="pt-4 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                    {isInstalled ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLaunch(emu)}
                          className="flex-1 px-4 py-2.5 text-sm bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Launch</span>
                        </button>

                        <button
                          onClick={() => handleOpenFolder(emu)}
                          className="p-2.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors"
                          title="Open Install Directory"
                        >
                          <FolderOpen className="w-4.5 h-4.5" />
                        </button>

                        <button
                          onClick={async () => {
                            const path = await invoke<string>("get_emulator_path", { emulatorId: emu.id });
                            setConfirmDeletePath(path);
                            setConfirmDelete(emu);
                          }}
                          className="p-2.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl transition-colors"
                          title="Uninstall"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelected(emu)}
                        className="w-full px-4 py-2.5 text-sm bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 active:bg-neutral-900 text-white font-semibold rounded-xl transition-all border border-neutral-700 dark:border-neutral-700 flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Download className="w-4 h-4 text-violet-400" />
                        <span>Install {emu.name}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Install Modal */}
      {selected && (
        <InstallModal
          emulator={selected}
          defaultPath={defaultPath}
          onClose={() => {
            setSelected(null);
            refreshStatuses();
          }}
          onSuccess={() => {
            refreshStatuses();
          }}
        />
      )}

      {/* Confirmation Modal for Uninstall */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">Uninstall {confirmDelete.name}?</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                  This will remove the application and its directory contents.
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 mb-5">
              <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Target Directory</p>
              <p className="text-xs text-neutral-800 dark:text-neutral-300 font-mono break-all select-all">
                {confirmDeletePath}
              </p>
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(null);
                  setConfirmDeletePath("");
                }}
                className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUninstall}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                {deleting ? "Removing..." : "Confirm Uninstall"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
