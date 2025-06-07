"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisIoAdapter = void 0;
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_service_1 = require("./shared/redis/redis.service");
class RedisIoAdapter extends platform_socket_io_1.IoAdapter {
    redisService;
    adapterConstructor;
    pubClient;
    subClient;
    constructor(appOrHttpServer, redisService) {
        super(appOrHttpServer);
        this.redisService = redisService;
    }
    async connectToRedis() {
        try {
            const existingClient = this.redisService.getClient();
            this.pubClient = existingClient.duplicate();
            this.subClient = existingClient.duplicate();
            this.pubClient.on('error', (err) => {
                common_1.Logger.error('Redis pub client error:', err, 'RedisIoAdapter');
            });
            this.subClient.on('error', (err) => {
                common_1.Logger.error('Redis sub client error:', err, 'RedisIoAdapter');
            });
            await Promise.all([
                new Promise((resolve, reject) => {
                    if (this.pubClient.status === 'ready') {
                        resolve();
                    }
                    else {
                        this.pubClient.on('ready', () => resolve());
                        this.pubClient.on('error', (err) => reject(err));
                    }
                }),
                new Promise((resolve, reject) => {
                    if (this.subClient.status === 'ready') {
                        resolve();
                    }
                    else {
                        this.subClient.on('ready', () => resolve());
                        this.subClient.on('error', (err) => reject(err));
                    }
                }),
            ]);
            common_1.Logger.log('Successfully connected to Redis for Socket.IO adapter', 'RedisIoAdapter');
            this.adapterConstructor = (0, redis_adapter_1.createAdapter)(this.pubClient, this.subClient);
        }
        catch (err) {
            common_1.Logger.error('Failed to connect to Redis for Socket.IO adapter', err, 'RedisIoAdapter');
            throw err;
        }
    }
    async close() {
        if (this.pubClient) {
            await this.pubClient.quit();
        }
        if (this.subClient) {
            await this.subClient.quit();
        }
    }
    createIOServer(port, options) {
        const server = super.createIOServer(port, options);
        server.adapter(this.adapterConstructor);
        common_1.Logger.log(`Socket.IO server initialized with Redis adapter on port ${port}`, 'RedisIoAdapter');
        return server;
    }
}
exports.RedisIoAdapter = RedisIoAdapter;
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const redisService = app.get(redis_service_1.RedisService);
    const logger = new common_1.Logger('Bootstrap');
    app.enableCors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:8888'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const redisIoAdapter = new RedisIoAdapter(app, redisService);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    const port = configService.get('port') || 3000;
    app.enableShutdownHooks();
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
    await app.listen(port, '0.0.0.0');
    logger.log(`Application is running on: ${await app.getUrl()}`);
    logger.log(`WebSocket server is running on namespace /chat`);
}
bootstrap();
//# sourceMappingURL=main.js.map