import { Emulator, ReleaseChannel, CustomSource } from "./types";

export function getDefaultChannel(emu: Emulator): ReleaseChannel {
  if (emu.default_channel === "stable" || emu.default_channel === "nightly") {
    return emu.default_channel;
  }
  return "stable";
}

export function getAvailableChannels(emu: Emulator): ReleaseChannel[] {
  if (!emu.channels) {
    return [getDefaultChannel(emu)];
  }
  const list: ReleaseChannel[] = [];
  if (emu.channels.stable !== undefined && emu.channels.stable !== null) {
    list.push("stable");
  }
  if (emu.channels.nightly !== undefined && emu.channels.nightly !== null) {
    list.push("nightly");
  }
  return list.length > 0 ? list : [getDefaultChannel(emu)];
}

export function getEffectiveOwner(emu: Emulator, channel: ReleaseChannel): string {
  const ch = emu.channels?.[channel];
  if (ch?.github_owner) return ch.github_owner;
  return emu.github_owner;
}

export function getEffectiveRepo(emu: Emulator, channel: ReleaseChannel): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isLinux = ua.includes("linux");
  const isWindows = ua.includes("windows");
  const ch = emu.channels?.[channel];

  if (ch) {
    if (isLinux && ch.github_repo_linux) return ch.github_repo_linux;
    if (isWindows && ch.github_repo_windows) return ch.github_repo_windows;
    if (ch.github_repo) return ch.github_repo;
  }

  if (isLinux && emu.github_repo_linux) return emu.github_repo_linux;
  if (isWindows && emu.github_repo_windows) return emu.github_repo_windows;
  return emu.github_repo;
}

export function getEffectiveAssetPattern(emu: Emulator, channel: ReleaseChannel): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isLinux = ua.includes("linux");
  const isWindows = ua.includes("windows");
  const ch = emu.channels?.[channel];

  if (ch) {
    if (isLinux && ch.asset_pattern_linux) return ch.asset_pattern_linux;
    if (isWindows && ch.asset_pattern_windows) return ch.asset_pattern_windows;
    if (ch.asset_pattern) return ch.asset_pattern;
  }

  if (isLinux && emu.asset_pattern_linux) return emu.asset_pattern_linux;
  if (isWindows && emu.asset_pattern_windows) return emu.asset_pattern_windows;
  return emu.asset_pattern;
}

export function getEffectiveCustomSource(emu: Emulator, channel: ReleaseChannel): CustomSource | null {
  const ch = emu.channels?.[channel];
  if (ch && ch.custom_source !== undefined) return ch.custom_source;
  return emu.custom_source ?? null;
}

export function getAssetPattern(emu: Emulator): string {
  return getEffectiveAssetPattern(emu, getDefaultChannel(emu));
}

export function getGithubRepo(emu: Emulator): string {
  return getEffectiveRepo(emu, getDefaultChannel(emu));
}
