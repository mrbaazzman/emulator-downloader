import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Emulator, ProgressPayload, ReleaseChannel } from "../types";
import {
  getDefaultChannel,
  getAvailableChannels,
  getEffectiveOwner,
  getEffectiveRepo,
  getEffectiveAssetPattern,
  getEffectiveCustomSource,
} from "../utils";
import EmulatorIcon from "./EmulatorIcon";
import {
  Download,
  Folder,
  FolderOpen,
  Play,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface InstallModalProps {
  emulator: Emulator;
  defaultPath: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InstallModal({ emulator, defaultPath, onClose, onSuccess }: InstallModalProps) {
  const sep = defaultPath.includes("\\") ? "\\" : "/";
  const [path, setPath] = useState(`${defaultPath}${sep}${emulator.id}`);
  const [portable, setPortable] = useState(true);
  const [channel, setChannel] = useState<ReleaseChannel>(() => getDefaultChannel(emulator));
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [fetchingVersion, setFetchingVersion] = useState(true);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "installing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState({ step: "", percent: 0 });

  const availableChannels = getAvailableChannels(emulator);

  useEffect(() => {
    let active = true;
    setFetchingVersion(true);
    setLatestVersion(null);
    setVersionError(null);

    invoke<string>("get_latest_version", {
      owner: getEffectiveOwner(emulator, channel),
      repo: getEffectiveRepo(emulator, channel),
      customSource: getEffectiveCustomSource(emulator, channel),
      channel,
    })
      .then((ver) => {
        if (active) {
          setLatestVersion(ver);
          setFetchingVersion(false);
        }
      })
      .catch((e) => {
        if (active) {
          setVersionError(String(e));
          setFetchingVersion(false);
        }
      });

    return () => {
      active = false;
    };
  }, [emulator, channel]);

  useEffect(() => {
    const unlisten = listen<ProgressPayload>("install-progress", (event) => {
      setProgress({
        step: event.payload.status,
        percent: Math.round(event.payload.progress),
      });
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "installing") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, onClose]);

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: `Select install directory for ${emulator.name}`,
    });
    if (selected && typeof selected === "string") {
      setPath(`${selected}${sep}${emulator.id}`);
    }
  };

  const handleInstall = async () => {
    setStatus("installing");
    setMessage("");
    setProgress({ step: "Connecting to release server...", percent: 5 });
    try {
      const version = await invoke<string>("download_and_install", {
        owner: getEffectiveOwner(emulator, channel),
        repo: getEffectiveRepo(emulator, channel),
        assetPattern: getEffectiveAssetPattern(emulator, channel),
        installPath: path,
        emulatorId: emulator.id,
        customSource: getEffectiveCustomSource(emulator, channel),
        channel,
        portable,
        portableType: emulator.portable_type ?? null,
        portableTarget: emulator.portable_target ?? null,
      });
      await invoke("save_emulator_path", { emulatorId: emulator.id, path });
      setStatus("done");
      setMessage(`Successfully installed ${version}!`);
      if (onSuccess) onSuccess();
    } catch (e) {
      setStatus("error");
      setMessage(String(e));
    }
  };

  const handleLaunch = async () => {
    await invoke("launch_emulator", { emulatorId: emulator.id }).catch(console.error);
    onClose();
  };

  const handleCancel = async () => {
    if (status === "installing") {
      await invoke("cancel_download").catch(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3.5">
            <EmulatorIcon id={emulator.id} className="w-11 h-11" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">{emulator.name}</h2>
                {fetchingVersion ? (
                  <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    fetching...
                  </span>
                ) : latestVersion ? (
                  <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-md font-mono font-medium">
                    {latestVersion}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{emulator.description}</p>
            </div>
          </div>

          {status !== "installing" && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Version warning if offline/unreachable */}
          {versionError && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Version check notice</p>
                <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-0.5">{versionError}</p>
              </div>
            </div>
          )}

          {/* Release Channel Selector */}
          {availableChannels.length > 1 && (
            <div>
              <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5 flex items-center justify-between">
                <span>Release Channel</span>
                <span className="text-xs text-neutral-500 font-normal">Choose build branch</span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setChannel("stable")}
                  disabled={status === "installing" || status === "done"}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    channel === "stable"
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  <span>Stable</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("nightly")}
                  disabled={status === "installing" || status === "done"}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    channel === "nightly"
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  <span>Nightly / Dev</span>
                </button>
              </div>
            </div>
          )}

          {/* Installation Path */}
          <div>
            <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5 flex items-center justify-between">
              <span>Install Folder</span>
              <span className="text-xs text-neutral-500 font-normal">Dedicated directory</span>
            </label>
            <div className="flex gap-2">
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={status === "installing" || status === "done"}
                className="flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-violet-500 font-mono disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleBrowse}
                disabled={status === "installing" || status === "done"}
                className="px-4 py-2.5 text-sm border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Folder className="w-4 h-4 text-neutral-500" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Portable Mode Toggle */}
          <div
            onClick={() => {
              if (status !== "installing" && status !== "done") {
                setPortable(!portable);
              }
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
              portable
                ? "bg-violet-50 dark:bg-violet-950/20 border-violet-300 dark:border-violet-800/50"
                : "bg-neutral-50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={portable}
                onChange={(e) => setPortable(e.target.checked)}
                disabled={status === "installing" || status === "done"}
                className="mt-1 w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 text-violet-600 focus:ring-violet-500"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Enable Portable Mode</span>
                  <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/40 px-2 py-0.2 rounded-md font-semibold">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                  Keeps all save files, memory cards, shaders, and configs inside the emulator folder instead of polluting your system AppData or home directory.
                </p>
              </div>
            </div>
          </div>

          {/* Progress / Status Display */}
          {(status === "installing" || status === "done" || status === "error") && (
            <div className="p-4.5 rounded-xl bg-neutral-100 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate pr-2 flex items-center gap-2">
                  {status === "installing" && <Loader2 className="w-4 h-4 animate-spin text-violet-600 dark:text-violet-400 shrink-0" />}
                  {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  {status === "error" && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
                  <span>{progress.step || (status === "done" ? "Installation complete" : "Installing...")}</span>
                </span>
                <span className="font-mono text-neutral-600 dark:text-neutral-400 text-xs font-bold">{progress.percent}%</span>
              </div>

              <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    status === "error"
                      ? "bg-red-500"
                      : status === "done"
                      ? "bg-emerald-500"
                      : "bg-violet-600"
                  }`}
                  style={{ width: `${Math.max(5, progress.percent)}%` }}
                />
              </div>

              {message && (
                <p
                  className={`text-xs mt-1 font-medium leading-relaxed ${
                    status === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "done" && (
              <>
                <button
                  type="button"
                  onClick={() => invoke("open_folder", { path })}
                  className="px-3.5 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl transition-colors flex items-center gap-1.5 font-medium"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open Folder</span>
                </button>
                <button
                  type="button"
                  onClick={handleLaunch}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Now</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl transition-colors font-medium"
            >
              {status === "done" ? "Close" : status === "installing" ? "Cancel Download" : "Cancel"}
            </button>

            {status !== "done" && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={status === "installing"}
                className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                {status === "installing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Installing...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Install {emulator.name}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
