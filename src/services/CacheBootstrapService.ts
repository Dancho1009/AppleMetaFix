import { cacheManagementService } from "./CacheManagementService";

export class CacheBootstrapService {
  initialize(): void {
    const result = cacheManagementService.cleanupExpired();

    console.log("[Cache] initialize cleanup", {
      searchDeleted: result.searchDeleted,
      trackDeleted: result.trackDeleted,
      totalDeleted: result.totalDeleted,
      cleanupTime: result.cleanupTime,
    });
  }
}
