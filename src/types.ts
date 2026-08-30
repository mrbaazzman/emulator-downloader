export type Page = "emulators" | "updates" | "settings";

export type ReleaseChannel = "stable" | "nightly";

export interface CustomSource {
  version_url: string;
  version_regex: string;
  download_url_template: string;
}

export interface ChannelSource {
  github_owner?: string | null;
  github_repo?: string | null;
  github_repo_windows?: string | null;
  github_repo_linux?: string | null;
  asset_pattern?: string | null;
  asset_pattern_windows?: string | null;
  asset_pattern_linux?: string | null;
  custom_source?: CustomSource | null;
}

export interface EmulatorChannels {
  stable?: ChannelSource | null;
  nightly?: ChannelSource | null;
}

export interface Emulator {
  id: string;
  name: string;
  description: string;
  github_owner: string;
  github_repo: string;
  github_repo_windows: string | null;
  github_repo_linux: string | null;
  asset_pattern: string;
  asset_pattern_windows: string | null;
  asset_pattern_linux: string | null;
  custom_source: CustomSource | null;
  default_channel?: string | null;
  channels?: EmulatorChannels | null;
  portable_type: string | null;
  portable_target: string | null;
}

export interface InstallStatus {
  installed: boolean;
  version: string | null;
  channel?: string | null;
  latest_version?: string | null;
  has_update?: boolean;
  is_portable?: boolean;
}

export interface UpdateInfo {
  emulator: Emulator;
  channel: ReleaseChannel;
  installedVersion: string;
  latestVersion: string;
  updating: boolean;
  done: boolean;
  percent: number;
  step: string;
}

export interface ProgressPayload {
  status: string;
  progress: number;
}
