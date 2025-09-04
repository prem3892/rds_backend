import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis'; // Use `ioredis` directly for adapter
import { RedisService } from './shared/redis/redis.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // Removed CORS

  // app.enableCors({
  //   origin: [
  //     'http://localhost:3000',
  //     'http://127.0.0.1:9000',
  //     'https://rds-frontend-mauve.vercel.app',
  //   ],
  // });
  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties not defined in DTO
      transform: true, // Automatically transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    }),
  );
  // app.useGlobalFilters(new GlobalHttpExceptionFilter()); // If you create a global HTTP filter

  // Setup Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Live Chat Application API')
    .setDescription(
      'A comprehensive real-time chat system with widget integration capabilities. This API provides chat functionality between customers and agents, with features like department selection, appointment scheduling, and embeddable chat widgets for websites.',
    )
    .setVersion('1.0')
    .setContact(
      'Development Team',
      'https://github.com/your-repo', // Update with your actual repo
      'dev@yourcompany.com', // Update with your actual email
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controllers
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Agents', 'Agent management and profile operations')
    .addTag(
      'Block Customer Management',
      'Admin-only customer blocking and unblocking operations',
    )
    .addTag('Chat', 'Real-time chat sessions and message management')
    .addTag(
      'Contacts',
      'Contact management and customer relationship operations',
    )
    .addTag('Departments', 'Department management and organization')
    .addTag('Widgets', 'Embeddable chat widget configuration and deployment')
    .addTag('Users', 'User management and profile operations')
    .addTag('Appointments', 'Appointment scheduling and management')
    .addTag('Visitor Tracking', 'Website visitor tracking and analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep authorization when refreshing
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Live Chat API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
  });

  // Setup Redis adapter for Socket.IO
  const redisIoAdapter = new RedisIoAdapter(app, redisService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = configService.get<number>('port') || 3000;

  // Graceful shutdown
  app.enableShutdownHooks(); // For onModuleDestroy, etc.

  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`API Documentation available at: ${await app.getUrl()}/api/docs`);
  logger.log(`WebSocket server is running on namespace /chat`);
}
bootstrap();
