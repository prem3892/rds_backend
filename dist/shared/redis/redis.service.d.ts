import { OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
export declare class RedisService implements OnModuleDestroy {
    private readonly redisClient;
    constructor(redisClient: Redis);
    onModuleDestroy(): Promise<void>;
    getClient(): Redis;
    mapSocketIdToAgentId(socketId: string, agentId: string): Promise<void>;
    getAgentIdBySocketId(socketId: string): Promise<string | null>;
    getSocketIdByAgentId(agentId: string): Promise<string | null>;
    removeAgentSocketMapping(socketId: string, agentId?: string): Promise<void>;
    mapSocketIdToCustomerId(socketId: string, customerId: string): Promise<void>;
    getCustomerIdBySocketId(socketId: string): Promise<string | null>;
    getSocketIdByCustomerId(customerId: string): Promise<string | null>;
    removeCustomerSocketMapping(socketId: string, customerId?: string): Promise<void>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
}
