import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import {
  REDIS_AGENT_SOCKET_ID_PREFIX,
  REDIS_CUSTOMER_SOCKET_ID_PREFIX,
  REDIS_SOCKET_AGENT_PREFIX,
  REDIS_SOCKET_CUSTOMER_PREFIX,
} from '../constants/enums';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  getClient(): Redis {
    return this.redisClient;
  }

  // Agent Socket Management
  async mapSocketIdToAgentId(socketId: string, agentId: string): Promise<void> {
    await this.redisClient.set(
      `${REDIS_SOCKET_AGENT_PREFIX}${socketId}`,
      agentId,
    );
    await this.redisClient.set(
      `${REDIS_AGENT_SOCKET_ID_PREFIX}${agentId}`,
      socketId,
    );
  }

  async getAgentIdBySocketId(socketId: string): Promise<string | null> {
    return this.redisClient.get(`${REDIS_SOCKET_AGENT_PREFIX}${socketId}`);
  }

  async getSocketIdByAgentId(agentId: string): Promise<string | null> {
    return this.redisClient.get(`${REDIS_AGENT_SOCKET_ID_PREFIX}${agentId}`);
  }

  async removeAgentSocketMapping(
    socketId: string,
    agentId?: string,
  ): Promise<void> {
    const currentAgentId =
      agentId || (await this.getAgentIdBySocketId(socketId));
    if (currentAgentId) {
      await this.redisClient.del(
        `${REDIS_AGENT_SOCKET_ID_PREFIX}${currentAgentId}`,
      );
    }
    await this.redisClient.del(`${REDIS_SOCKET_AGENT_PREFIX}${socketId}`);
  }

  // Customer Socket Management
  async mapSocketIdToCustomerId(
    socketId: string,
    customerId: string,
  ): Promise<void> {
    await this.redisClient.set(
      `${REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`,
      customerId,
    );
    await this.redisClient.set(
      `${REDIS_CUSTOMER_SOCKET_ID_PREFIX}${customerId}`,
      socketId,
    );
  }

  async getCustomerIdBySocketId(socketId: string): Promise<string | null> {
    return this.redisClient.get(`${REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`);
  }

  async getSocketIdByCustomerId(customerId: string): Promise<string | null> {
    return this.redisClient.get(
      `${REDIS_CUSTOMER_SOCKET_ID_PREFIX}${customerId}`,
    );
  }

  async removeCustomerSocketMapping(
    socketId: string,
    customerId?: string,
  ): Promise<void> {
    const currentCustomerId =
      customerId || (await this.getCustomerIdBySocketId(socketId));
    if (currentCustomerId) {
      await this.redisClient.del(
        `${REDIS_CUSTOMER_SOCKET_ID_PREFIX}${currentCustomerId}`,
      );
    }
    await this.redisClient.del(`${REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`);
  }

  // Generic key-value operations if needed
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
