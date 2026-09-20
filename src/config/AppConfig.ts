import fs from "node:fs";
import path from "node:path";

export interface AppConfig {
  appleMusic?: {
    mediaUserToken?: string;
    storefront?: string;
  };
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.resolve(process.cwd(), "config", "config.json");
    const content = fs.readFileSync(configPath, "utf-8");
    cachedConfig = JSON.parse(content) as AppConfig;
    console.log("[CONFIG] loaded", configPath);
  } catch (error) {
    console.warn("[CONFIG] config.json not found, using default", error);
    cachedConfig = {};
  }

  return cachedConfig;
}

export function getMediaUserToken(): string | undefined {
  return loadConfig().appleMusic?.mediaUserToken;
}
