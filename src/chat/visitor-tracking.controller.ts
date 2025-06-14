import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { UserRole } from 'src/shared/constants/enums';
import { VisitorStateService } from './services/visitor-state/visitor-state.service';
import {
  VisitorListResponse,
  VisitorSyncResponse,
} from 'src/shared/interfaces/visitor-tracking.interface';
import { VisitorSyncDto } from './dto/visitor-sync.dto';

@Controller('api/agents/visitors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class VisitorTrackingController {
  private readonly logger = new Logger(VisitorTrackingController.name);

  constructor(private readonly visitorStateService: VisitorStateService) {}

  /**
   * Get current visitor state for agent's accessible widgets
   * GET /api/agents/visitors/current
   */
  @Get('current')
  async getCurrentVisitors(
    @Request() req: any,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<VisitorListResponse> {
    try {
      const agentId = req.user.userId;
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const sinceDate = since ? new Date(since) : undefined;

      // Validate limit
      if (parsedLimit < 1 || parsedLimit > 1000) {
        throw new HttpException(
          'Limit must be between 1 and 1000',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate since date
      if (since && isNaN(sinceDate?.getTime() || 0)) {
        throw new HttpException(
          'Invalid since date format',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.visitorStateService.getVisitorsForAgent(
        agentId,
        sinceDate,
        parsedLimit,
        cursor,
      );

      this.logger.debug(
        `Retrieved ${result.visitors.length} visitors for agent ${agentId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get current visitors for agent: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve visitor data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get visitor changes since a specific timestamp (for delta updates)
   * GET /api/agents/visitors/changes
   */
  @Get('changes')
  async getVisitorChanges(
    @Request() req: any,
    @Query('since') since: string,
    @Query('limit') limit?: string,
  ): Promise<VisitorSyncResponse> {
    try {
      if (!since) {
        throw new HttpException(
          'Since parameter is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const agentId = req.user.userId;
      const parsedLimit = limit ? parseInt(limit, 10) : 100;
      const sinceDate = new Date(since);

      // Validate since date
      if (isNaN(sinceDate.getTime())) {
        throw new HttpException(
          'Invalid since date format',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate limit
      if (parsedLimit < 1 || parsedLimit > 1000) {
        throw new HttpException(
          'Limit must be between 1 and 1000',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.visitorStateService.getVisitorChangesSince(
        agentId,
        sinceDate,
        parsedLimit,
      );

      this.logger.debug(
        `Retrieved ${result.changes.length} visitor changes for agent ${agentId} since ${since}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get visitor changes for agent: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve visitor changes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sync visitor state with client
   * POST /api/agents/visitors/sync
   */
  @Post('sync')
  async syncVisitorState(
    @Request() req: any,
    @Body() syncRequest: VisitorSyncDto,
  ): Promise<VisitorSyncResponse> {
    try {
      const agentId = req.user.userId;
      const { lastSync, forceFullSync = false } = syncRequest;

      // If no lastSync provided or force full sync requested, return full state
      if (!lastSync || forceFullSync) {
        const fullData = await this.visitorStateService.getVisitorsForAgent(
          agentId,
          undefined,
          1000, // Max visitors for full sync
        );

        return {
          since: new Date().toISOString(),
          changes: fullData.visitors.map((visitor) => ({
            type: 'update' as any,
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

      // Parse lastSync date
      const sinceDate = new Date(lastSync);
      if (isNaN(sinceDate.getTime())) {
        throw new HttpException(
          'Invalid lastSync date format',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Return delta changes
      const result = await this.visitorStateService.getVisitorChangesSince(
        agentId,
        sinceDate,
        100,
      );

      this.logger.debug(
        `Synced visitor state for agent ${agentId}: ${result.changes.length} changes since ${lastSync}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to sync visitor state for agent: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to sync visitor state',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get visitor statistics (admin only)
   * GET /api/agents/visitors/stats
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getVisitorStatistics(): Promise<{
    totalVisitors: number;
    connectedVisitors: number;
    disconnectedVisitors: number;
    widgetBreakdown: Record<string, number>;
  }> {
    try {
      const stats = await this.visitorStateService.getVisitorStatistics();

      this.logger.debug('Retrieved visitor statistics');

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to get visitor statistics: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        'Failed to retrieve visitor statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger manual cleanup (admin only)
   * POST /api/agents/visitors/cleanup
   */
  @Post('cleanup')
  @Roles(UserRole.ADMIN)
  async triggerCleanup(): Promise<{
    cleanedCount: number;
    totalProcessed: number;
    errors: string[];
  }> {
    try {
      const result = await this.visitorStateService.cleanupExpiredVisitors();

      this.logger.log(
        `Manual visitor cleanup completed: ${result.cleanedCount} visitors cleaned`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to trigger visitor cleanup: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        'Failed to trigger cleanup',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
