import { Page } from "../types";
import { Gamepad2, RefreshCw, Settings, Sun, Moon } from "lucide-react";

interface SidebarProps {
  page: Page;
  setPage: (p: Page) => void;
  updateCount: number;
  checkingUpdates: boolean;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function Sidebar({
  page,
  setPage,
  updateCount,
  checkingUpdates,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const navItems = [
    {
      id: "emulators" as Page,
      label: "Emulators",
      icon: Gamepad2,
      badge: null,
    },
    {
      id: "updates" as Page,
      label: "Updates",
      icon: RefreshCw,
      badge: updateCount > 0 ? updateCount : null,
      spinning: checkingUpdates,
    },
    {
      id: "settings" as Page,
      label: "Settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between shrink-0 select-none transition-colors">
      <div>
        {/* App Branding */}
        <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-sm shadow-violet-600/30">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white leading-tight">
                EmuVault
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Emulator Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3.5 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-600/10 dark:bg-violet-600/20 text-violet-700 dark:text-violet-300 font-semibold border border-violet-500/30 shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      item.spinning
                        ? "animate-spin text-violet-600 dark:text-violet-400"
                        : active
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-violet-600 text-white leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls: Theme Toggle */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Appearance</span>
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-medium shadow-xs transition-colors"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-violet-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
