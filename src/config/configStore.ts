import { constants as fsConstants } from "node:fs";
import { access, chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir, platform } from "node:os";
import type { ConfigKey, EllygentConfig } from "../types/config.js";

export class ConfigStore {
  private readonly configPath: string;

  constructor(configPath = defaultConfigPath()) {
    this.configPath = configPath;
  }

  get path(): string {
    return this.configPath;
  }

  async load(): Promise<EllygentConfig> {
    try {
      const raw = await readFile(this.configPath, "utf8");
      const parsed = JSON.parse(raw) as EllygentConfig;
      return sanitizeConfig(parsed);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return {};
      }
      throw new ConfigError(`Could not read Ellygent config at ${this.configPath}`);
    }
  }

  async save(config: EllygentConfig): Promise<void> {
    const cleanConfig = sanitizeConfig(config);
    const dir = dirname(this.configPath);
    await mkdir(dir, { recursive: true });

    const tempPath = `${this.configPath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(cleanConfig, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(tempPath, this.configPath);
    await chmod(this.configPath, 0o600).catch(() => undefined);
  }

  async set(key: ConfigKey, value: string): Promise<EllygentConfig> {
    const config = await this.load();
    config[key] = normalizeConfigValue(key, value);
    await this.save(config);
    return config;
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.configPath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function defaultConfigPath(): string {
  const home = homedir();
  if (platform() === "win32") {
    const appData = process.env.APPDATA;
    return join(appData && appData.trim() ? appData : join(home, "AppData", "Roaming"), "Ellygent", "config.json");
  }

  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome && xdgConfigHome.trim()) {
    return join(xdgConfigHome, "ellygent", "config.json");
  }

  return join(home, ".ellygent", "config.json");
}

export function normalizeApiUrl(apiUrl: string): string {
  const trimmed = String(apiUrl || "").trim();
  if (!trimmed) {
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ConfigError("API URL must be a valid absolute URL");
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function normalizeConfigValue(key: ConfigKey, value: string): string {
  if (key === "apiUrl") {
    return normalizeApiUrl(value);
  }
  return String(value || "").trim();
}

function sanitizeConfig(config: EllygentConfig): EllygentConfig {
  return {
    apiUrl: stringOrUndefined(config.apiUrl),
    accessToken: stringOrUndefined(config.accessToken),
    refreshToken: stringOrUndefined(config.refreshToken),
    defaultOrg: stringOrUndefined(config.defaultOrg),
    defaultProject: stringOrUndefined(config.defaultProject),
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
