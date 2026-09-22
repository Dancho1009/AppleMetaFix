import { CachePolicyService } from './CachePolicyService';

const DEFAULT_RETENTION_DAYS = 30;

export interface CacheBootstrapOptions {
  retentionDays?: number;
}

export class CacheBootstrapService {
  private readonly cachePolicyService = new CachePolicyService();

  initialize(options: CacheBootstrapOptions = {}): void {
    const retentionDays = options.retentionDays ?? DEFAULT_RETENTION_DAYS;

    console.log('[Cache] initialize cleanup, retentionDays:', retentionDays);

    this.cachePolicyService.cleanup({
      retentionDays,
    });
  }
}
