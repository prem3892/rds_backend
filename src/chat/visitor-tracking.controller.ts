import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiBody,
} from '@nestjs/swagger';
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
import {
  VisitorListResponseDto,
  VisitorSyncResponseDto,
  VisitorStatisticsResponseDto,
  VisitorCleanupResponseDto,
} from './dto/visitor-tracking-responses.dto';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  SuccessMessageResponseDto,
} from '../shared/dto/common-responses.dto';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';

@ApiTags('Visitor Tracking')
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current visitors for agent',
    description:
      'Retrieve current visitor state for widgets accessible to the authenticated agent',
  })
  @ApiQuery({
    name: 'since',
    description: 'Get visitors active since this timestamp (ISO format)',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of visitors to return (1-1000)',
    example: '100',
    required: false,
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Pagination cursor for fetching next page',
    example: 'cursor_abc123',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Current visitors retrieved successfully',
    type: VisitorListResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid query parameters (limit out of range or invalid date format)',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve visitor data',
    type: ErrorResponseDto,
  })
  async getCurrentVisitors(
    @AuthenticatedUser() user: JwtPayload,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<VisitorListResponse> {
    try {
      const agentId = user.sub;
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get visitor changes since timestamp',
    description:
      'Retrieve visitor changes since a specific timestamp for delta updates',
  })
  @ApiQuery({
    name: 'since',
    description: 'Timestamp to get changes since (ISO format) - required',
    example: '2024-01-15T10:30:00.000Z',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of changes to return (1-1000)',
    example: '100',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Visitor changes retrieved successfully',
    type: VisitorSyncResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Missing since parameter, invalid date format, or limit out of range',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve visitor changes',
    type: ErrorResponseDto,
  })
  async getVisitorChanges(
    @AuthenticatedUser() user: JwtPayload,
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

      const agentId = user.sub;
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sync visitor state with client',
    description:
      'Synchronize visitor state with client, supporting both full sync and delta updates',
  })
  @ApiBody({
    type: VisitorSyncDto,
    description: 'Sync request parameters',
    examples: {
      'Full sync': {
        summary: 'Request full sync',
        description: 'Force a complete sync of all visitor data',
        value: {
          forceFullSync: true,
        },
      },
      'Delta sync': {
        summary: 'Request delta sync',
        description: 'Get changes since last sync timestamp',
        value: {
          lastSync: '2024-01-15T10:30:00.000Z',
          version: 1,
        },
      },
      'Initial sync': {
        summary: 'Initial sync request',
        description: 'First sync request without lastSync timestamp',
        value: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Visitor state synchronized successfully',
    type: VisitorSyncResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid lastSync date format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to sync visitor state',
    type: ErrorResponseDto,
  })
  async syncVisitorState(
    @AuthenticatedUser() user: JwtPayload,
    @Body() syncRequest: VisitorSyncDto,
  ): Promise<VisitorSyncResponse> {
    try {
      const agentId = user.sub;
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get visitor statistics (Admin only)',
    description:
      'Retrieve comprehensive visitor statistics including totals and widget breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Visitor statistics retrieved successfully',
    type: VisitorStatisticsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to retrieve visitor statistics',
    type: ErrorResponseDto,
  })
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
   * Debug Redis keys (admin only)
   * GET /api/agents/visitors/debug-redis
   */
  @Get('debug-redis')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Debug Redis visitor keys (Admin only)',
    description: 'Get all visitor-related Redis keys for debugging',
  })
  @ApiResponse({
    status: 200,
    description: 'Redis keys retrieved successfully',
  })
  async debugRedisKeys(): Promise<{
    visitorStateKeys: string[];
    visitorActivityKeys: string[];
    sampleData: any;
  }> {
    try {
      const redis = this.visitorStateService['redisService'].getClient();

      // Get all visitor state keys
      const visitorStateKeys = await redis.keys('visitor_state:*');
      const visitorActivityKeys = await redis.keys('visitor_activity:*');

      // Get sample data from first key if available
      let sampleData: { key: string; data: Record<string, string> } | null =
        null;
      if (visitorStateKeys.length > 0) {
        const firstKey = visitorStateKeys[0];
        const data = await redis.hgetall(firstKey);
        sampleData = { key: firstKey, data };
      }

      this.logger.log(
        `[DEBUG] Found ${visitorStateKeys.length} visitor state keys and ${visitorActivityKeys.length} activity keys`,
      );

      return {
        visitorStateKeys,
        visitorActivityKeys,
        sampleData,
      };
    } catch (error) {
      this.logger.error(
        `Failed to debug Redis keys: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        'Failed to debug Redis keys',
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Trigger manual visitor cleanup (Admin only)',
    description: 'Manually trigger cleanup of expired visitors from the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Visitor cleanup completed successfully',
    type: VisitorCleanupResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Failed to trigger cleanup',
    type: ErrorResponseDto,
  })
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
