import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Cron, CronExpression } from '@nestjs/schedule';

import { Server } from 'socket.io';
import { Types } from 'mongoose';

import { RedisService } from 'src/shared/redis/redis.service';
import { AgentsService } from 'src/agents/agents.service';
import {
  REDIS_VISITOR_STATE_PREFIX,
  REDIS_VISITOR_ACTIVITY_PREFIX,
  VisitorStatus,
  VisitorEventType,
  VisitorChangeType,
} from 'src/shared/constants/enums';
import {
  VisitorState,
  VisitorChange,
  VisitorSyncResponse,
  VisitorListResponse,
  VisitorActivityEvent,
  VisitorCleanupResult,
} from 'src/shared/interfaces/visitor-tracking.interface';

@Injectable()
export class VisitorStateService {
  private readonly logger = new Logger(VisitorStateService.name);
  private readonly redisTtlSeconds: number;
  private readonly cleanupIntervalMs: number;
  private readonly gracePeriodMs: number;
  private readonly maxVisitorsPerAgent: number;
  private readonly deltaUpdateEnabled: boolean;

  private server: Server | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly agentsService: AgentsService,
    private readonly configService: ConfigService,
  ) {
    this.redisTtlSeconds =
      this.configService.get<number>('visitorTracking.redisTtlSeconds') || 1800;
    this.cleanupIntervalMs =
      this.configService.get<number>('visitorTracking.cleanupIntervalMs') ||
      120000;
    this.gracePeriodMs =
      this.configService.get<number>('visitorTracking.gracePeriodMs') || 300000;
    this.maxVisitorsPerAgent =
      this.configService.get<number>('visitorTracking.maxVisitorsPerAgent') ||
      1000;
    this.deltaUpdateEnabled =
      this.configService.get<boolean>('visitorTracking.deltaUpdateEnabled') ||
      false;
  }

  /**
   * Set the Socket.IO server instance (called from ChatGateway)
   */
  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Generate Redis key for visitor state
   */
  private getVisitorStateKey(widgetId: string, domain: string): string {
    return `${REDIS_VISITOR_STATE_PREFIX}${widgetId}:${domain}`;
  }

  /**
   * Generate Redis key for visitor activity tracking
   */
  private getVisitorActivityKey(
    widgetId: string,
    domain: string,
    customerId: string,
  ): string {
    return `${REDIS_VISITOR_ACTIVITY_PREFIX}${widgetId}:${domain}:${customerId}`;
  }

  /**
   * Update visitor state in Redis
   */
  async updateVisitorState(
    widgetId: string,
    domain: string,
    customerId: string,
    visitorData: Partial<VisitorState>,
    eventType: VisitorEventType = VisitorEventType.UPDATE,
  ): Promise<VisitorState | null> {
    try {
      const stateKey = this.getVisitorStateKey(widgetId, domain);
      const redis = this.redisService.getClient();

      // Get current state
      const currentStateStr = await redis.hget(stateKey, customerId);
      let currentState: VisitorState | null = null;

      if (currentStateStr) {
        try {
          currentState = JSON.parse(currentStateStr);
        } catch (error) {
          this.logger.warn(
            `Failed to parse existing visitor state for ${customerId}: ${error.message}`,
          );
        }
      }

      // Create updated state
      const now = new Date();
      const updatedState: VisitorState = {
        customerId,
        widgetId,
        domain,
        name: visitorData.name || currentState?.name || 'Anonymous Visitor',
        status:
          visitorData.status || currentState?.status || VisitorStatus.CONNECTED,
        lastActivity: now,
        connectedAt:
          visitorData.connectedAt || currentState?.connectedAt || now,
        metadata: { ...currentState?.metadata, ...visitorData.metadata },
        socketId: visitorData.socketId || currentState?.socketId,
        email: visitorData.email || currentState?.email,
        phone: visitorData.phone || currentState?.phone,
        fingerprint: visitorData.fingerprint || currentState?.fingerprint,
        currentPageUrl:
          visitorData.currentPageUrl || currentState?.currentPageUrl,
        browserInfo: {
          ...currentState?.browserInfo,
          ...visitorData.browserInfo,
        },
      };

      // Store updated state in Redis
      await redis.hset(stateKey, customerId, JSON.stringify(updatedState));
      await redis.expire(stateKey, this.redisTtlSeconds);

      // Track activity for delta updates
      if (this.deltaUpdateEnabled) {
        const activityKey = this.getVisitorActivityKey(
          widgetId,
          domain,
          customerId,
        );
        const change: VisitorChange = {
          type: this.mapEventTypeToChangeType(eventType),
          customerId,
          data: visitorData,
          timestamp: now,
        };
        await redis.set(
          activityKey,
          JSON.stringify(change),
          'EX',
          this.redisTtlSeconds,
        );
      }

      this.logger.debug(
        `Updated visitor state for ${customerId} on widget ${widgetId} (${eventType}) payload ${JSON.stringify(updatedState)}}`,
      );

      return updatedState;
    } catch (error) {
      this.logger.error(
        `Failed to update visitor state for ${customerId}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get visitor state for a specific customer
   */
  async getVisitorState(
    widgetId: string,
    domain: string,
    customerId: string,
  ): Promise<VisitorState | null> {
    try {
      const stateKey = this.getVisitorStateKey(widgetId, domain);
      const redis = this.redisService.getClient();

      const stateStr = await redis.hget(stateKey, customerId);
      if (!stateStr) {
        return null;
      }

      return JSON.parse(stateStr);
    } catch (error) {
      this.logger.error(
        `Failed to get visitor state for ${customerId}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Remove visitor state
   */
  async removeVisitorState(
    widgetId: string,
    domain: string,
    customerId: string,
  ): Promise<boolean> {
    try {
      const stateKey = this.getVisitorStateKey(widgetId, domain);
      const redis = this.redisService.getClient();

      const result = await redis.hdel(stateKey, customerId);

      // Also remove activity tracking
      if (this.deltaUpdateEnabled) {
        const activityKey = this.getVisitorActivityKey(
          widgetId,
          domain,
          customerId,
        );
        await redis.del(activityKey);
      }

      this.logger.debug(
        `Removed visitor state for ${customerId} on widget ${widgetId}`,
      );

      return result > 0;
    } catch (error) {
      this.logger.error(
        `Failed to remove visitor state for ${customerId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get all visitors for agent's accessible widgets
   */
  async getVisitorsForAgent(
    agentId: string,
    since?: Date,
    limit: number = 100,
    cursor?: string,
  ): Promise<VisitorListResponse> {
    try {
      // Get agent's accessible widgets
      const agent = await this.agentsService.findAgentProfileByUserId(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const widgets =
        await this.agentsService.getAgentAccessibleWidgets(agentId);
      const redis = this.redisService.getClient();
      const allVisitors: VisitorState[] = [];

      // Collect visitors from all accessible widgets
      for (const widget of widgets) {
        // For simplicity, we'll use a default domain or get from widget
        // In a real implementation, you might need to handle multiple domains per widget
        const domains = widget.allowedDomains || ['*'];

        for (const domain of domains) {
          const stateKey = this.getVisitorStateKey(
            widget._id.toString(),
            domain,
          );
          const visitorData = await redis.hgetall(stateKey);

          for (const [customerId, stateStr] of Object.entries(visitorData)) {
            try {
              const visitor: VisitorState = JSON.parse(stateStr);

              // Filter by since date if provided
              if (since && new Date(visitor.lastActivity) <= since) {
                continue;
              }

              allVisitors.push(visitor);
            } catch (error) {
              this.logger.warn(
                `Failed to parse visitor state for ${customerId}: ${error.message}`,
              );
            }
          }
        }
      }

      // Sort by last activity (most recent first)
      allVisitors.sort(
        (a, b) =>
          new Date(b.lastActivity).getTime() -
          new Date(a.lastActivity).getTime(),
      );

      // Apply pagination
      const startIndex = cursor ? parseInt(cursor, 10) : 0;
      const endIndex = startIndex + limit;
      const paginatedVisitors = allVisitors.slice(startIndex, endIndex);
      const hasMore = endIndex < allVisitors.length;
      const nextCursor = hasMore ? endIndex.toString() : undefined;

      return {
        visitors: paginatedVisitors,
        totalCount: allVisitors.length,
        hasMore,
        nextCursor,
        lastSync: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get visitors for agent ${agentId}: ${error.message}`,
        error.stack,
      );
      return {
        visitors: [],
        totalCount: 0,
        hasMore: false,
        lastSync: new Date(),
      };
    }
  }

  /**
   * Get visitor changes since a specific timestamp (for delta updates)
   */
  async getVisitorChangesSince(
    agentId: string,
    since: Date,
    limit: number = 100,
  ): Promise<VisitorSyncResponse> {
    try {
      if (!this.deltaUpdateEnabled) {
        // Fall back to full sync
        const fullData = await this.getVisitorsForAgent(
          agentId,
          undefined,
          limit,
        );
        return {
          since: since.toISOString(),
          changes: fullData.visitors.map((visitor) => ({
            type: VisitorChangeType.UPDATE,
            customerId: visitor.customerId,
            data: visitor,
            timestamp: new Date(visitor.lastActivity),
          })),
          fullSync: true,
          totalVisitors: fullData.totalCount,
          hasMore: fullData.hasMore,
          nextCursor: fullData.nextCursor,
        };
      }

      // Get agent's accessible widgets
      const widgets =
        await this.agentsService.getAgentAccessibleWidgets(agentId);
      const redis = this.redisService.getClient();
      const changes: VisitorChange[] = [];

      // Collect changes from all accessible widgets
      for (const widget of widgets) {
        const domains = widget.allowedDomains || ['*'];

        for (const domain of domains) {
          const pattern = this.getVisitorActivityKey(
            widget._id.toString(),
            domain,
            '*',
          );
          const keys = await redis.keys(pattern);

          for (const key of keys) {
            try {
              const changeStr = await redis.get(key);
              if (changeStr) {
                const change: VisitorChange = JSON.parse(changeStr);
                if (new Date(change.timestamp) > since) {
                  changes.push(change);
                }
              }
            } catch (error) {
              this.logger.warn(
                `Failed to parse change from key ${key}: ${error.message}`,
              );
            }
          }
        }
      }

      // Sort by timestamp
      changes.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Apply limit
      const limitedChanges = changes.slice(0, limit);
      const hasMore = changes.length > limit;

      return {
        since: since.toISOString(),
        changes: limitedChanges,
        fullSync: false,
        hasMore,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get visitor changes for agent ${agentId}: ${error.message}`,
        error.stack,
      );
      return {
        since: since.toISOString(),
        changes: [],
        fullSync: false,
      };
    }
  }

  /**
   * Notify eligible agents about visitor activity
   */
  async notifyAgentsAboutVisitor(
    customer: any,
    widget: any,
    domain: string,
    eventType: VisitorEventType,
  ): Promise<void> {
    try {
      if (!this.server) {
        this.logger.warn(
          'Socket.IO server not available for visitor notifications',
        );
        return;
      }

      // Update visitor state first
      const visitorState = await this.updateVisitorState(
        widget._id.toString(),
        domain,
        customer._id.toString(),
        {
          name: customer.name || 'Anonymous Visitor',
          email: customer.email,
          phone: customer.phone,
          fingerprint: customer.fingerprint,
          metadata: customer.metadata || {},
          currentPageUrl: customer.metadata?.currentPageUrl,
          browserInfo: customer.metadata?.browserInfo,
          status:
            eventType === VisitorEventType.DISCONNECT
              ? VisitorStatus.DISCONNECTED
              : VisitorStatus.CONNECTED,
        },
        eventType,
      );

      if (!visitorState) {
        this.logger.warn(`Failed to update visitor state for ${customer._id}`);
        return;
      }

      // Get eligible agents for this widget and domain
      const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(
        widget._id,
        domain,
      );

      if (eligibleAgents.length === 0) {
        this.logger.debug(
          `No eligible agents found for visitor notification on widget ${widget._id}`,
        );
        return;
      }

      // Prepare visitor activity event
      const visitorActivityEvent: VisitorActivityEvent = {
        customerId: customer._id.toString(),
        customerProfile: {
          name: customer.name || 'Anonymous Visitor',
          email: customer.email || null,
          phone: customer.phone || null,
          fingerprint: customer.fingerprint,
          metadata: customer.metadata || {},
        },
        widget: {
          id: widget._id.toString(),
          name: widget.name || 'Chat Widget',
          departmentIds:
            widget.departmentIds?.map((dept: any) => ({
              id: dept._id?.toString() || dept.toString(),
              name: dept.name || 'Unknown Department',
            })) || [],
        },
        domain: domain,
        currentPageUrl: customer.metadata?.currentPageUrl || 'unknown',
        browserInfo: customer.metadata?.browserInfo || {},
        timestamp: new Date(),
        eventType: eventType,
      };

      // Send notification to all eligible agents
      for (const agent of eligibleAgents) {
        this.server
          .to(`agent:${agent.userId.toString()}`)
          .emit('server:visitor_activity', visitorActivityEvent);
      }

      this.logger.log(
        `Notified ${eligibleAgents.length} eligible agents about ${eventType} for customer ${customer._id} on widget ${widget._id} payload ${JSON.stringify(visitorActivityEvent)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify agents about visitor activity: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cleanup expired visitor states
   */
  @Cron('0 */2 * * * *') // Every 2 minutes
  async cleanupExpiredVisitors(): Promise<VisitorCleanupResult> {
    this.logger.debug('Running visitor state cleanup job...');

    const result: VisitorCleanupResult = {
      cleanedCount: 0,
      totalProcessed: 0,
      errors: [],
    };

    try {
      const redis = this.redisService.getClient();
      const pattern = `${REDIS_VISITOR_STATE_PREFIX}*`;
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        try {
          const visitorData = await redis.hgetall(key);
          const expiredVisitors: string[] = [];
          const now = new Date();

          for (const [customerId, stateStr] of Object.entries(visitorData)) {
            try {
              const visitor: VisitorState = JSON.parse(stateStr);
              const lastActivity = new Date(visitor.lastActivity);
              const timeSinceActivity = now.getTime() - lastActivity.getTime();

              if (timeSinceActivity > this.gracePeriodMs) {
                expiredVisitors.push(customerId);
              }

              result.totalProcessed++;
            } catch (error) {
              result.errors.push(
                `Failed to parse visitor ${customerId}: ${error.message}`,
              );
            }
          }

          // Remove expired visitors
          if (expiredVisitors.length > 0) {
            await redis.hdel(key, ...expiredVisitors);
            result.cleanedCount += expiredVisitors.length;

            // Notify agents about disconnected visitors
            for (const customerId of expiredVisitors) {
              if (this.server) {
                // Extract widget and domain from key
                const keyParts = key
                  .replace(REDIS_VISITOR_STATE_PREFIX, '')
                  .split(':');
                if (keyParts.length >= 2) {
                  const widgetId = keyParts[0];
                  const domain = keyParts.slice(1).join(':');

                  // Get eligible agents and notify
                  const eligibleAgents =
                    await this.agentsService.getEligibleOnlineAgents(
                      new Types.ObjectId(widgetId),
                      domain,
                    );

                  for (const agent of eligibleAgents) {
                    this.server
                      .to(`agent:${agent.userId.toString()}`)
                      .emit('server:visitor_cleanup', {
                        customerId,
                        widgetId,
                        domain,
                        reason: 'expired',
                        timestamp: now,
                      });
                  }
                }
              }
            }
          }
        } catch (error) {
          result.errors.push(`Failed to process key ${key}: ${error.message}`);
        }
      }

      this.logger.log(
        `Visitor cleanup completed: ${result.cleanedCount} expired visitors removed from ${result.totalProcessed} total processed`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(`Cleanup errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(
        `Visitor cleanup job failed: ${error.message}`,
        error.stack,
      );
      result.errors.push(`Cleanup job failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Map event type to change type for delta updates
   */
  private mapEventTypeToChangeType(
    eventType: VisitorEventType,
  ): VisitorChangeType {
    switch (eventType) {
      case VisitorEventType.CONNECT:
      case VisitorEventType.RECONNECT:
        return VisitorChangeType.CONNECT;
      case VisitorEventType.DISCONNECT:
        return VisitorChangeType.DISCONNECT;
      default:
        return VisitorChangeType.UPDATE;
    }
  }

  /**
   * Get visitor statistics for monitoring
   */
  async getVisitorStatistics(): Promise<{
    totalVisitors: number;
    connectedVisitors: number;
    disconnectedVisitors: number;
    widgetBreakdown: Record<string, number>;
  }> {
    try {
      const redis = this.redisService.getClient();
      const pattern = `${REDIS_VISITOR_STATE_PREFIX}*`;
      const keys = await redis.keys(pattern);

      let totalVisitors = 0;
      let connectedVisitors = 0;
      let disconnectedVisitors = 0;
      const widgetBreakdown: Record<string, number> = {};

      for (const key of keys) {
        const visitorData = await redis.hgetall(key);
        const widgetId = key
          .replace(REDIS_VISITOR_STATE_PREFIX, '')
          .split(':')[0];

        for (const stateStr of Object.values(visitorData)) {
          try {
            const visitor: VisitorState = JSON.parse(stateStr);
            totalVisitors++;

            if (visitor.status === VisitorStatus.CONNECTED) {
              connectedVisitors++;
            } else {
              disconnectedVisitors++;
            }

            widgetBreakdown[widgetId] = (widgetBreakdown[widgetId] || 0) + 1;
          } catch (error) {
            // Skip invalid entries
          }
        }
      }

      return {
        totalVisitors,
        connectedVisitors,
        disconnectedVisitors,
        widgetBreakdown,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get visitor statistics: ${error.message}`,
        error.stack,
      );
      return {
        totalVisitors: 0,
        connectedVisitors: 0,
        disconnectedVisitors: 0,
        widgetBreakdown: {},
      };
    }
  }
}
