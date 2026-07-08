import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check() {
    let database = 'ok';
    let redis = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') redis = 'error';
    } catch {
      redis = 'error';
    }

    const allOk = database === 'ok' && redis === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      service: 'PharmaVie API',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }
}
