/**
 * Redis Cache Management
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  socket: {
    tls: process.env.REDIS_TLS === 'true',
    rejectUnauthorized: false,
  },
};

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }
  
  redisClient = createClient(REDIS_CONFIG);
  
  redisClient.on('error', (error) => {
    console.error('Redis Client Error:', error);
  });
  
  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });
  
  await redisClient.connect();
  
  return redisClient;
}

export class CacheService {
  private static client: RedisClientType | null = null;
  
  private static async getClient() {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }
  
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  static async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    try {
      const client = await this.getClient();
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  static async del(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  static async delPattern(pattern: string): Promise<void> {
    try {
      const client = await this.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }
  
  static async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const client = await this.getClient();
      const value = await client.incr(key);
      if (ttlSeconds && value === 1) {
        await client.expire(key, ttlSeconds);
      }
      return value;
    } catch (error) {
      console.error('Cache incr error:', error);
      return 0;
    }
  }
  
  static async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }
}

if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });
  
  process.on('SIGINT', async () => {
    if (redisClient) {
      await redisClient.quit();
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    if (redisClient) {
      await redisClient.quit();
    }
    process.exit(0);
  });
}
