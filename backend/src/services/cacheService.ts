import logger from '../utils/logger';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
  };
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired items every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  // Get item from cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      return null;
    }

    this.stats.hits++;
    return item.data;
  }

  // Set item in cache
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    const isNew = !this.cache.has(key);
    this.cache.set(key, item);
    
    this.stats.sets++;
    if (isNew) {
      this.stats.size++;
    }
  }

  // Delete item from cache
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size--;
    }
    return deleted;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get cache hit ratio
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  // Cleanup expired items
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size -= cleaned;
      logger.debug(`Cache cleanup: removed ${cleaned} expired items`);
    }
  }

  // Evict oldest item when cache is full
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.size--;
    }
  }

  // Destroy cache service
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  // Cache wrapper for functions
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache function execution failed for key: ${key}`, error);
      throw error;
    }
  }

  // Generate cache key from object
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|');
    
    return `${prefix}:${sortedParams}`;
  }

  // Cache invalidation patterns
  invalidatePattern(pattern: string): number {
    let invalidated = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.stats.size -= invalidated;
    return invalidated;
  }

  // Preload cache with common data
  async preload(loaders: Array<{ key: string; loader: () => Promise<any>; ttl?: number }>): Promise<void> {
    const promises = loaders.map(async ({ key, loader, ttl }) => {
      try {
        const data = await loader();
        this.set(key, data, ttl);
        logger.debug(`Preloaded cache key: ${key}`);
      } catch (error) {
        logger.error(`Failed to preload cache key: ${key}`, error);
      }
    });

    await Promise.allSettled(promises);
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 30 * 60 * 1000,      // 30 minutes
  VERY_LONG: 2 * 60 * 60 * 1000, // 2 hours
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  CUSTOMERS: 'customers',
  CUSTOMER: 'customer',
  PARTIES: 'parties',
  PARTY: 'party',
  JOBS: 'alteration_jobs',
  JOB: 'alteration_job',
  APPOINTMENTS: 'appointments',
  APPOINTMENT: 'appointment',
  USERS: 'users',
  USER: 'user',
  STATS: 'stats',
  LIGHTSPEED_HEALTH: 'lightspeed_health',
} as const;

export default cacheService;
