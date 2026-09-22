import { AppleMusicCacheService } from "./AppleMusicCacheService";

const cacheService = new AppleMusicCacheService();

export class CacheManagementService {
  getStats() {
    return cacheService.getStats();
  }

  clearCache() {
    cacheService.clear();
    return this.getStats();
  }
}

export const cacheManagementService = new CacheManagementService();
