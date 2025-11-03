import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import {
  REDIS_AGENT_SOCKET_ID_PREFIX,
  REDIS_CUSTOMER_SOCKET_ID_PREFIX,
  REDIS_SOCKET_AGENT_PREFIX,
  REDIS_SOCKET_CUSTOMER_PREFIX,
  REDIS_AGENT_SOCKETS_PREFIX,
  REDIS_CUSTOMER_SOCKETS_PREFIX,
} from '../constants/enums';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

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

  // Multi-Socket Support Methods for Agents

  /**
   * Add a socket to an agent's socket set (supports multiple devices)
   */
  async addAgentSocket(agentId: string, socketId: string): Promise<void> {
    this.logger.log(`Adding socket ${socketId} to agent ${agentId}`);

    // Add to the agent's socket set
    await this.redisClient.sadd(
      `${REDIS_AGENT_SOCKETS_PREFIX}${agentId}`,
      socketId,
    );

    // Maintain the socket-to-agent mapping
    await this.redisClient.set(
      `${REDIS_SOCKET_AGENT_PREFIX}${socketId}`,
      agentId,
    );

    const socketCount = await this.getAgentSocketCount(agentId);
    this.logger.log(
      `Agent ${agentId} now has ${socketCount} connected socket(s)`,
    );
  }

  /**
   * Remove a specific socket from an agent's socket set
   */
  async removeAgentSocket(agentId: string, socketId: string): Promise<void> {
    this.logger.log(`Removing socket ${socketId} from agent ${agentId}`);

    // Remove from the agent's socket set
    await this.redisClient.srem(
      `${REDIS_AGENT_SOCKETS_PREFIX}${agentId}`,
      socketId,
    );

    // Remove the socket-to-agent mapping
    await this.redisClient.del(`${REDIS_SOCKET_AGENT_PREFIX}${socketId}`);

    const socketCount = await this.getAgentSocketCount(agentId);
    this.logger.log(
      `Agent ${agentId} now has ${socketCount} connected socket(s)`,
    );

    // Clean up empty sets
    if (socketCount === 0) {
      await this.redisClient.del(`${REDIS_AGENT_SOCKETS_PREFIX}${agentId}`);
      this.logger.log(`Cleaned up empty socket set for agent ${agentId}`);
    }
  }

  /**
   * Get all socket IDs for a specific agent
   */
  async getAllSocketsForAgent(agentId: string): Promise<string[]> {
    const sockets = await this.redisClient.smembers(
      `${REDIS_AGENT_SOCKETS_PREFIX}${agentId}`,
    );
    this.logger.debug(`Agent ${agentId} has sockets: [${sockets.join(', ')}]`);
    return sockets;
  }

  /**
   * Get the count of connected sockets for an agent
   */
  async getAgentSocketCount(agentId: string): Promise<number> {
    const count = await this.redisClient.scard(
      `${REDIS_AGENT_SOCKETS_PREFIX}${agentId}`,
    );
    return count;
  }

  /**
   * Check if an agent has any connected sockets
   */
  async hasAgentSockets(agentId: string): Promise<boolean> {
    const count = await this.getAgentSocketCount(agentId);
    return count > 0;
  }

  /**
   * Enhanced agent socket mapping that supports multiple sockets
   * This replaces the old mapSocketIdToAgentId for new multi-socket flow
   */
  async mapSocketIdToAgentIdMulti(
    socketId: string,
    agentId: string,
  ): Promise<void> {
    this.logger.log(
      `Mapping socket ${socketId} to agent ${agentId} (multi-socket mode)`,
    );
    await this.addAgentSocket(agentId, socketId);
  }

  /**
   * Enhanced agent socket removal that supports multiple sockets
   * This replaces the old removeAgentSocketMapping for new multi-socket flow
   */
  async removeAgentSocketMappingMulti(
    socketId: string,
    agentId?: string,
  ): Promise<void> {
    const currentAgentId =
      agentId || (await this.getAgentIdBySocketId(socketId));
    if (currentAgentId) {
      this.logger.log(
        `Removing socket ${socketId} from agent ${currentAgentId} (multi-socket mode)`,
      );
      await this.removeAgentSocket(currentAgentId, socketId);
    } else {
      this.logger.warn(`No agent found for socket ${socketId} during removal`);
    }
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

  // Multi-Socket Support Methods for Customers

  /**
   * Add a socket to a customer's socket set (supports multiple devices)
   */
  async addCustomerSocket(customerId: string, socketId: string): Promise<void> {
    this.logger.log(`Adding socket ${socketId} to customer ${customerId}`);

    // Add to the customer's socket set
    await this.redisClient.sadd(
      `${REDIS_CUSTOMER_SOCKETS_PREFIX}${customerId}`,
      socketId,
    );

    // Maintain the socket-to-customer mapping
    await this.redisClient.set(
      `${REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`,
      customerId,
    );

    const socketCount = await this.getCustomerSocketCount(customerId);
    this.logger.log(
      `Customer ${customerId} now has ${socketCount} connected socket(s)`,
    );
  }

  /**
   * Remove a specific socket from a customer's socket set
   */
  async removeCustomerSocket(
    customerId: string,
    socketId: string,
  ): Promise<void> {
    this.logger.log(`Removing socket ${socketId} from customer ${customerId}`);

    // Remove from the customer's socket set
    await this.redisClient.srem(
      `${REDIS_CUSTOMER_SOCKETS_PREFIX}${customerId}`,
      socketId,
    );

    // Remove the socket-to-customer mapping
    await this.redisClient.del(`${REDIS_SOCKET_CUSTOMER_PREFIX}${socketId}`);

    const socketCount = await this.getCustomerSocketCount(customerId);
    this.logger.log(
      `Customer ${customerId} now has ${socketCount} connected socket(s)`,
    );

    // Clean up empty sets
    if (socketCount === 0) {
      await this.redisClient.del(
        `${REDIS_CUSTOMER_SOCKETS_PREFIX}${customerId}`,
      );
      this.logger.log(`Cleaned up empty socket set for customer ${customerId}`);
    }
  }

  /**
   * Get all socket IDs for a specific customer
   */
  async getAllSocketsForCustomer(customerId: string): Promise<string[]> {
    const sockets = await this.redisClient.smembers(
      `${REDIS_CUSTOMER_SOCKETS_PREFIX}${customerId}`,
    );
    this.logger.debug(
      `Customer ${customerId} has sockets: [${sockets.join(', ')}]`,
    );
    return sockets;
  }

  /**
   * Get the count of connected sockets for a customer
   */
  async getCustomerSocketCount(customerId: string): Promise<number> {
    const count = await this.redisClient.scard(
      `${REDIS_CUSTOMER_SOCKETS_PREFIX}${customerId}`,
    );
    return count;
  }

  /**
   * Check if a customer has any connected sockets
   */
  async hasCustomerSockets(customerId: string): Promise<boolean> {
    const count = await this.getCustomerSocketCount(customerId);
    return count > 0;
  }

  /**
   * Enhanced customer socket mapping that supports multiple sockets
   * This replaces the old mapSocketIdToCustomerId for new multi-socket flow
   */
  async mapSocketIdToCustomerIdMulti(
    socketId: string,
    customerId: string,
  ): Promise<void> {
    this.logger.log(
      `Mapping socket ${socketId} to customer ${customerId} (multi-socket mode)`,
    );
    await this.addCustomerSocket(customerId, socketId);
  }

  /**
   * Enhanced customer socket removal that supports multiple sockets
   * This replaces the old removeCustomerSocketMapping for new multi-socket flow
   */
  async removeCustomerSocketMappingMulti(
    socketId: string,
    customerId?: string,
  ): Promise<void> {
    const currentCustomerId =
      customerId || (await this.getCustomerIdBySocketId(socketId));
    if (currentCustomerId) {
      this.logger.log(
        `Removing socket ${socketId} from customer ${currentCustomerId} (multi-socket mode)`,
      );
      await this.removeCustomerSocket(currentCustomerId, socketId);
    } else {
      this.logger.warn(
        `No customer found for socket ${socketId} during removal`,
      );
    }
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
