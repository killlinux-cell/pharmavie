import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        return new Redis(url, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
