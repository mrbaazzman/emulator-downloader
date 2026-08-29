import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  Folder,
  FolderOpen,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  HardDrive,
  Sun,
  Moon,
} from "lucide-react";

interface SettingsPageProps {
  defaultPath: string;
  savePath: (p: string) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function SettingsPage({
  defaultPath,
  savePath,
  theme,
  onToggleTheme,
}: SettingsPageProps) {
  const [input, setInput] = useState(defaultPath);
  const [saved, setSaved] = useState(false);
  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    invoke<string>("load_github_token").then((t) => {
      if (t) setToken(t);
    });
  }, []);

  useEffect(() => {
    setInput(defaultPath);
  }, [defaultPath]);

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select default emulator root folder",
    });
    if (selected && typeof selected === "string") {
      setInput(selected);
    }
  };

  const handleSave = () => {
    savePath(input);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveToken = () => {
    invoke("save_github_token", { token });
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 2000);
  };

  const handleOpenFolder = () => {
    if (input) {
      invoke("open_folder", { path: input });
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-neutral-100 dark:bg-neutral-950 transition-colors">
      {/* Header */}
      <header className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/50 backdrop-blur-xs flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure paths, theme preferences, and credentials
          </p>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-3xl space-y-6">
        {/* Section 1: Default Install Location */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Default Installation Folder</h2>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 ml-11">
            New emulators will be installed into isolated subfolders inside this directory.
          </p>

          <div className="space-y-3.5 ml-11">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-violet-500 font-mono"
                placeholder="C:\Emulators"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="px-4 py-2.5 text-sm border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Folder className="w-4 h-4 text-neutral-500" />
                <span>Browse</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleOpenFolder}
                className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Open folder in file explorer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Appearance & Theme */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Appearance</h2>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 ml-11">
            Choose your preferred color theme for the interface.
          </p>

          <div className="ml-11 flex gap-3">
            <button
              onClick={() => {
                if (theme !== "light") onToggleTheme();
              }}
              className={`flex-1 p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                theme === "light"
                  ? "bg-violet-50 border-violet-500 text-violet-900 shadow-xs font-semibold"
                  : "bg-neutral-50 dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold">Light Theme</span>
              </div>
              {theme === "light" && <Check className="w-4 h-4 text-violet-600" />}
            </button>

            <button
              onClick={() => {
                if (theme !== "dark") onToggleTheme();
              }}
              className={`flex-1 p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                theme === "dark"
                  ? "bg-violet-950/40 border-violet-500 text-white shadow-xs font-semibold"
                  : "bg-neutral-50 dark:bg-neutral-950/50 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold">Dark Theme</span>
              </div>
              {theme === "dark" && <Check className="w-4 h-4 text-violet-400" />}
            </button>
          </div>
        </div>

        {/* Section 3: GitHub API Access Token */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
              <KeyRound className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">GitHub Access Token (Optional)</h2>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 ml-11">
            Authenticate GitHub API requests to lift the hourly unauthenticated rate limit from 60 to 5,000 requests.
          </p>

          <div className="space-y-3.5 ml-11">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  type={showToken ? "text" : "password"}
                  placeholder="github_pat_... or ghp_..."
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-violet-500 font-mono pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveToken}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                {tokenSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>

            {token && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="w-4 h-4" />
                <span>Personal access token is saved and active</span>
              </p>
            )}
          </div>
        </div>

        {/* Section 4: Portability Information */}
        <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Portable Mode Isolation</h2>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed ml-11">
            EmuVault automatically writes required marker files (such as <code className="text-violet-600 dark:text-violet-300 bg-neutral-100 dark:bg-neutral-950 px-1.5 py-0.5 rounded font-mono text-xs">portable.ini</code>, <code className="text-violet-600 dark:text-violet-300 bg-neutral-100 dark:bg-neutral-950 px-1.5 py-0.5 rounded font-mono text-xs">portable.txt</code>, or local config folders) into each emulator installation. All save data, configs, and memory cards stay cleanly contained in the installation folder.
          </p>
        </div>
      </div>
    </div>
  );
}
