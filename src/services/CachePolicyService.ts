import { AppleMusicCacheService } from "./AppleMusicCacheService";

export interface CachePolicyConfig {
  retentionDays: number;
}

export class CachePolicyService {
  private readonly cacheService = new AppleMusicCacheService();

  cleanup(config: CachePolicyConfig): void {
    if (config.retentionDays <= 0) {
      return;
    }

    // 当前缓存仓储未保存访问时间字段，暂时执行整体清理。
    // 后续增加缓存时间戳字段后替换为按TTL删除。
    this.cacheService.clearExpired(config.retentionDays);
  }
}
