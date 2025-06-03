import { IoAdapter } from '@nestjs/platform-socket.io';
import { RedisService } from './shared/redis/redis.service';
export declare class RedisIoAdapter extends IoAdapter {
    private readonly redisService;
    private adapterConstructor;
    private pubClient;
    private subClient;
    constructor(appOrHttpServer: any, redisService: RedisService);
    connectToRedis(): Promise<void>;
    close(): Promise<void>;
    createIOServer(port: number, options?: any): any;
}
