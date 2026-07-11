import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';

type MemoryEntry = { code: string; expiresAt: number };

export class OtpCache {
  private readonly logger = new Logger(OtpCache.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private redisAvailable = true;

  constructor(private readonly redis: Redis) {}

  async set(phone: string, code: string, ttlSeconds: number): Promise<void> {
    this.purgeExpired();
    if (this.redisAvailable) {
      try {
        await this.redis.setex(`otp:${phone}`, ttlSeconds, code);
        return;
      } catch (err) {
        this.redisAvailable = false;
        this.logger.warn(`Redis indisponible — bascule OTP mémoire : ${err}`);
      }
    }
    this.memory.set(phone, {
      code,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async get(phone: string): Promise<string | null> {
    this.purgeExpired();
    if (this.redisAvailable) {
      try {
        const stored = await this.redis.get(`otp:${phone}`);
        if (stored) return stored;
      } catch (err) {
        this.redisAvailable = false;
        this.logger.warn(`Redis indisponible — lecture OTP mémoire : ${err}`);
      }
    }
    const entry = this.memory.get(phone);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memory.delete(phone);
      return null;
    }
    return entry.code;
  }

  async del(phone: string): Promise<void> {
    this.memory.delete(phone);
    if (!this.redisAvailable) return;
    try {
      await this.redis.del(`otp:${phone}`);
    } catch {
      this.redisAvailable = false;
    }
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [phone, entry] of this.memory) {
      if (entry.expiresAt <= now) this.memory.delete(phone);
    }
  }
}
