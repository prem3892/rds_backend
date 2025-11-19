import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  Response,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { Roles } from 'src/shared/decorators/roles.decorator';
import { AuthenticatedUser } from 'src/shared/decorators/user.decorator';
import { UserRole } from 'src/shared/constants/enums';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { GetAttributionDto } from './dto/get-attribution.dto';
import { GetAttributionResponseDto } from './dto/attribution-response.dto';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';

@ApiTags('Analytics')
@Controller('api/analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('attribution')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get attribution analytics for chats and appointments',
    description:
      'Fetches analytics data with filters by source (Google Ads, Meta, ChatGPT, Organic), domain, date range, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Attribution analytics data',
    type: GetAttributionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Agent trying to access other agent data',
  })
  async getAttribution(
    @Query() filters: GetAttributionDto,
    @AuthenticatedUser() user: JwtPayload,
  ): Promise<GetAttributionResponseDto> {
    try {
      return await this.analyticsService.getAttribution(filters, user);
    } catch (error) {
      if (error.message.includes('Agent does not belong')) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('attribution/export')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Export attribution analytics to Excel',
    description: 'Exports filtered analytics data as Excel file',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file with analytics data',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async exportAttribution(
    @Query() filters: GetAttributionDto,
    @AuthenticatedUser() user: JwtPayload,
    @Response() res: any,
  ): Promise<void> {
    try {
      const data = await this.analyticsService.getAttribution(filters, user);

      const workbook = XLSX.utils.book_new();

      const summaryData = data.summary.breakdown.map((item) => ({
        Source: item.source,
        Chats: item.chats,
        Appointments: item.appointments,
        'Conversion Rate': item.conversionRate,
      }));

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      const detailedData = data.items.map((item) => ({
        'Chat Session ID': item.chatSessionId,
        'Customer ID': item.customerId,
        'Agent Name': item.agentName || 'N/A',
        Source: item.source,
        Domain: item.domain,
        'Campaign Name': item.campaignName || 'N/A',
        'Chat Date': item.createdAt,
        'Appointment ID': item.appointmentId || 'N/A',
        'Appointment Date': item.appointmentDate || 'N/A',
        'Appointment Status': item.appointmentStatus || 'N/A',
      }));

      const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Records');

      const summaryStatsSheet = XLSX.utils.json_to_sheet([
        {
          'Total Chats': data.summary.totalChats,
          'Total Appointments': data.summary.totalAppointments,
          'Overall Conversion Rate': data.summary.conversionRate,
        },
      ]);
      XLSX.utils.book_append_sheet(workbook, summaryStatsSheet, 'Statistics');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `attribution-analytics-${timestamp}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      const buffer = XLSX.write(workbook, { type: 'buffer' });
      res.send(buffer);
    } catch (error) {
      if (error.message.includes('Agent does not belong')) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
}
