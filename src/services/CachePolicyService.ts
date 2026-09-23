import { cleanupAppleMusicCache, AppleMusicCacheCleanupResult } from "../database/appleMusicCacheCleanupRepository";

export interface CachePolicyConfig {
  retentionDays: number;
}

export class CachePolicyService {
  cleanup(config: CachePolicyConfig): AppleMusicCacheCleanupResult {
    if (config.retentionDays <= 0) {
      return {
        searchDeleted: 0,
        trackDeleted: 0,
        totalDeleted: 0,
      };
    }

    return cleanupAppleMusicCache(config.retentionDays);
  }
}
