import { UpdateInfo } from "../types";
import EmulatorIcon from "../components/EmulatorIcon";
import { RefreshCw, ArrowRight, CheckCircle2, Sparkles, Loader2 } from "lucide-react";

interface UpdatesPageProps {
  updates: UpdateInfo[] | null;
  checking: boolean;
  onCheck: () => void;
  onUpdate: (index: number) => void;
  onUpdateAll?: () => void;
}

export default function UpdatesPage({ updates, checking, onCheck, onUpdate, onUpdateAll }: UpdatesPageProps) {
  const pendingUpdates = updates?.filter((u) => !u.done) || [];
  const hasPending = pendingUpdates.length > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-950 transition-colors">
      {/* Header */}
      <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 backdrop-blur-xs flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">Updates</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Keep your installed emulators updated with the latest upstream builds
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasPending && onUpdateAll && (
            <button
              onClick={onUpdateAll}
              disabled={checking}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Update All ({pendingUpdates.length})</span>
            </button>
          )}

          <button
            onClick={onCheck}
            disabled={checking}
            className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin text-violet-600 dark:text-violet-400" : ""}`} />
            <span>{checking ? "Scanning releases..." : "Check for updates"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-4xl">
        {/* Initial / Unchecked State */}
        {updates === null && !checking && (
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center justify-center my-6 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 mb-3.5">
              <RefreshCw className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Check for New Releases</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mt-1 mb-5">
              Scan installed emulators against upstream GitHub and release endpoints.
            </p>
            <button
              onClick={onCheck}
              className="px-5 py-2.5 text-sm bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Scan Installed Emulators</span>
            </button>
          </div>
        )}

        {/* Checking Active Banner */}
        {checking && (
          <div className="bg-white dark:bg-neutral-900/80 border border-violet-200 dark:border-violet-900/40 rounded-2xl p-8 flex flex-col items-center text-center justify-center my-6 shadow-xs">
            <Loader2 className="w-9 h-9 text-violet-600 dark:text-violet-400 animate-spin mb-3.5" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Scanning Upstream Releases...</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mt-1">
              Checking for new release tags and builds...
            </p>
          </div>
        )}

        {/* All Up to Date State */}
        {updates !== null && !checking && updates.length === 0 && (
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 flex flex-col items-center text-center justify-center my-6 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3.5">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Everything is Up to Date</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mt-1 mb-5">
              All installed emulators are running the latest available release.
            </p>
            <button
              onClick={onCheck}
              className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium rounded-xl transition-colors shadow-xs"
            >
              Recheck Now
            </button>
          </div>
        )}

        {/* Available Updates List */}
        {updates !== null && updates.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {updates.length} {updates.length === 1 ? "Update" : "Updates"} Available
            </p>

            {updates.map((u, i) => (
              <div
                key={u.emulator.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 rounded-2xl p-5 transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <EmulatorIcon id={u.emulator.id} className="w-11 h-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate">{u.emulator.name}</h3>
                        <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-md font-mono capitalize">
                          {u.channel}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{u.emulator.description}</span>
                      </div>

                      {/* Version Diff Pill */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 rounded-lg font-mono font-medium max-w-[160px] truncate" title={u.installedVersion}>
                          {u.installedVersion}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="text-xs bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/40 px-2.5 py-1 rounded-lg font-mono font-bold max-w-[160px] truncate" title={u.latestVersion}>
                          {u.latestVersion}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onUpdate(i)}
                    disabled={u.updating || u.done}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 ${
                      u.done
                        ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 cursor-default"
                        : u.updating
                        ? "bg-violet-600/60 text-white cursor-wait"
                        : "bg-violet-600 hover:bg-violet-500 text-white active:bg-violet-700"
                    }`}
                  >
                    {u.done ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Updated</span>
                      </>
                    ) : u.updating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Update to {u.latestVersion}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress bar during update */}
                {(u.updating || u.done) && (
                  <div className="mt-4 pt-3.5 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2">
                    <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                      <span className="truncate pr-2">{u.step || "Updating emulator..."}</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200 font-bold">{u.percent}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          u.done ? "bg-emerald-500" : "bg-violet-600"
                        }`}
                        style={{ width: `${u.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
