import { Emulator } from "./types";

export function getAssetPattern(emu: Emulator): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("linux") && emu.asset_pattern_linux) return emu.asset_pattern_linux;
  if (ua.includes("windows") && emu.asset_pattern_windows) return emu.asset_pattern_windows;
  return emu.asset_pattern;
}

export function getGithubRepo(emu: Emulator): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("linux") && emu.github_repo_linux) return emu.github_repo_linux;
  if (ua.includes("windows") && emu.github_repo_windows) return emu.github_repo_windows;
  return emu.github_repo;
}
