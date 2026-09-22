import { cleanupAppleMusicCache } from "../database/appleMusicCacheCleanupRepository";

export interface CachePolicyConfig {
  retentionDays: number;
}

export class CachePolicyService {
  cleanup(config: CachePolicyConfig): void {
    if (config.retentionDays <= 0) {
      return;
    }

    cleanupAppleMusicCache(config.retentionDays);
  }
}
