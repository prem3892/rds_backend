import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

@Global() // Make it global so other modules can use RedisService without importing
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string | undefined>('redis.password'),
          tls: {}, // Enable TLS for Upstash Redis
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: false,
          connectTimeout: 10000,
          commandTimeout: 5000,
        });
      },
      inject: [ConfigService], // ConfigService is available globally
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class AppRedisModule {}
