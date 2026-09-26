import {
  AppleMusicCacheService,
  AppleMusicCacheStats,
} from "./AppleMusicCacheService";
import {
  AppleMusicCacheCleanupResult,
} from "../database/appleMusicCacheCleanupRepository";
import { getConfig, updateConfig } from "../config/ConfigService";
import { CachePolicyService } from "./CachePolicyService";

export interface CacheManagementStats extends AppleMusicCacheStats {
  lastCleanupTime: string | null;
}

export interface CacheCleanupSummary extends AppleMusicCacheCleanupResult {
  cleanupTime: string;
  stats: CacheManagementStats;
}

const cacheService = new AppleMusicCacheService();
const cachePolicyService = new CachePolicyService();

export class CacheManagementService {
  getStats(): CacheManagementStats {
    return {
      ...cacheService.getStats(),
      lastCleanupTime: getConfig().cache.lastCleanupTime,
    };
  }

  cleanupExpired(): CacheCleanupSummary {
    const config = getConfig();
    const result = cachePolicyService.cleanup({
      retentionDays: config.cache.retentionDays,
    });
    const cleanupTime = this.recordCleanupTime();

    return {
      ...result,
      cleanupTime,
      stats: this.getStats(),
    };
  }

  clearCache(): CacheCleanupSummary {
    const result = cacheService.clear();
    const cleanupTime = this.recordCleanupTime();

    return {
      ...result,
      cleanupTime,
      stats: this.getStats(),
    };
  }

  private recordCleanupTime(): string {
    const cleanupTime = new Date().toISOString();

    updateConfig({
      cache: {
        lastCleanupTime: cleanupTime,
      },
    });

    return cleanupTime;
  }
}

export const cacheManagementService = new CacheManagementService();
