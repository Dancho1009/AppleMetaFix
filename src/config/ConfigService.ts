import fs from "node:fs";
import path from "node:path";
import {
  AppConfig,
  AppConfigPatch,
  DEFAULT_APP_CONFIG,
  normalizeAppConfig,
} from "./AppConfig";

let cachedConfig: AppConfig | null = null;

function getConfigPath(): string {
  return path.resolve(process.cwd(), "config", "config.json");
}

function persistConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function loadConfig(forceReload = false): AppConfig {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  const configPath = getConfigPath();

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    cachedConfig = normalizeAppConfig(JSON.parse(content) as AppConfigPatch);
    console.log("[CONFIG] loaded", configPath);
  } catch (error) {
    console.warn("[CONFIG] config.json not found or invalid, using default", error);
    cachedConfig = normalizeAppConfig(DEFAULT_APP_CONFIG);
  }

  return cachedConfig;
}

export function getConfig(): AppConfig {
  return loadConfig();
}

export function updateConfig(patch: AppConfigPatch): AppConfig {
  const current = getConfig();
  const next = normalizeAppConfig({
    appleMusic: {
      ...current.appleMusic,
      ...(patch.appleMusic ?? {}),
    },
    cache: {
      ...current.cache,
      ...(patch.cache ?? {}),
    },
    display: {
      appleMusic: {
        ...current.display.appleMusic,
        ...(patch.display?.appleMusic ?? {}),
      },
    },
  });

  persistConfig(next);
  cachedConfig = next;

  return next;
}

export function resetConfig(): AppConfig {
  const next = normalizeAppConfig(DEFAULT_APP_CONFIG);
  persistConfig(next);
  cachedConfig = next;
  return next;
}

export function reloadConfig(): AppConfig {
  return loadConfig(true);
}

export function getMediaUserToken(): string | undefined {
  return getConfig().appleMusic.mediaUserToken || undefined;
}
