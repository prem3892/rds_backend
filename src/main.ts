import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis'; // Use `ioredis` directly for adapter
import { RedisService } from './shared/redis/redis.service';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(
    appOrHttpServer: any,
    private readonly redisService: RedisService,
  ) {
    super(appOrHttpServer);
  }

  async connectToRedis(): Promise<void> {
    try {
      // Get the existing Redis client from RedisService
      const existingClient = this.redisService.getClient();

      // Create a duplicate for pub/sub operations
      this.pubClient = existingClient.duplicate();
      this.subClient = existingClient.duplicate();

      // Add error handlers
      this.pubClient.on('error', (err) => {
        Logger.error('Redis pub client error:', err, 'RedisIoAdapter');
      });

      this.subClient.on('error', (err) => {
        Logger.error('Redis sub client error:', err, 'RedisIoAdapter');
      });

      // Wait for both clients to be ready
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          if (this.pubClient.status === 'ready') {
            resolve();
          } else {
            this.pubClient.on('ready', () => resolve());
            this.pubClient.on('error', (err) => reject(err));
          }
        }),
        new Promise<void>((resolve, reject) => {
          if (this.subClient.status === 'ready') {
            resolve();
          } else {
            this.subClient.on('ready', () => resolve());
            this.subClient.on('error', (err) => reject(err));
          }
        }),
      ]);

      Logger.log(
        'Successfully connected to Redis for Socket.IO adapter',
        'RedisIoAdapter',
      );
      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
    } catch (err) {
      Logger.error(
        'Failed to connect to Redis for Socket.IO adapter',
        err,
        'RedisIoAdapter',
      );
      throw err; // Propagate error to prevent server start if Redis is critical
    }
  }

  async close(): Promise<void> {
    if (this.pubClient) {
      await this.pubClient.quit();
    }
    if (this.subClient) {
      await this.subClient.quit();
    }
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    Logger.log(
      `Socket.IO server initialized with Redis adapter on port ${port}`,
      'RedisIoAdapter',
    );
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const redisService = app.get(RedisService);
  const logger = new Logger('Bootstrap');

  // app.enableCors({
  //   origin: '*', // Configure for specific origins in production
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //   credentials: true,
  // });
  // app.enableCors({
  //   // wrong!  in my case, anyway
  //   origin: 'http://localhost:3000',
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   allowedHeaders: 'Content-Type, Accept',
  //   credentials: true,
  // });

  // app.enableCors({
  //   origin: 'http://localhost:3000',
  //   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'], // 👈 OPTIONS is important
  //   allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // 👈 Add Authorization if you're using bearer tokens
  //   credentials: true,
  // });

  app.enableCors({
    origin: ['*'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties not defined in DTO
      transform: true, // Automatically transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    }),
  );
  // app.useGlobalFilters(new GlobalHttpExceptionFilter()); // If you create a global HTTP filter

  // Setup Redis adapter for Socket.IO
  const redisIoAdapter = new RedisIoAdapter(app, redisService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = configService.get<number>('port') || 3000;

  // Graceful shutdown
  app.enableShutdownHooks(); // For onModuleDestroy, etc.

  // Handling SIGINT/SIGTERM for more control (optional, NestJS handles some of this)
  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received. Closing HTTP server.');
    await redisIoAdapter.close();
    await app.close();
    logger.log('HTTP server closed. Exiting.');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received. Closing HTTP server.');
    await redisIoAdapter.close();
    await app.close();
    logger.log('HTTP server closed. Exiting.');
    process.exit(0);
  });

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`WebSocket server is running on namespace /chat`);
}
bootstrap();
