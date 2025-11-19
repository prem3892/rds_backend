import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatSession,
  ChatSessionDocument,
} from 'src/schemas/chat-session.schema';
import {
  Appointment,
  AppointmentDocument,
} from 'src/schemas/appointment.schema';
import { Customer, CustomerDocument } from 'src/schemas/customer.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import {
  AttributionService,
  TrafficSource,
} from 'src/shared/services/attribution.service';
import { UserRole } from 'src/shared/constants/enums';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { AdminResolverUtil } from 'src/shared/utils/admin-resolver.util';
import {
  GetAttributionDto,
  GroupBy,
  AnalyticsType,
  SortBy,
} from './dto/get-attribution.dto';
import {
  GetAttributionResponseDto,
  DetailedRecordDto,
  SummaryDto,
  SourceBreakdownDto,
} from './dto/attribution-response.dto';
import { AgentsService } from 'src/agents/agents.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly attributionService: AttributionService,
    private readonly agentsService: AgentsService,
  ) {}

  async getAttribution(
    filters: GetAttributionDto,
    user: JwtPayload,
  ): Promise<GetAttributionResponseDto> {
    let allowedAgentIds: Types.ObjectId[] = [];

    if (user.role === UserRole.AGENT) {
      allowedAgentIds = [new Types.ObjectId(user.sub)];
    } else if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      const adminId = await AdminResolverUtil.resolveAdminId(
        user,
        this.agentsService,
      );
      const agentProfiles =
        await this.agentsService.getAllAgentProfilesWithUserDetails(adminId);
      allowedAgentIds = agentProfiles.map((profile) => profile.userId);

      if (filters.agentId) {
        const requestedAgentId = new Types.ObjectId(filters.agentId);
        if (
          !allowedAgentIds.some(
            (id) => id.toString() === requestedAgentId.toString(),
          )
        ) {
          throw new ForbiddenException(
            'Agent does not belong to your organization',
          );
        }
        allowedAgentIds = [requestedAgentId];
      }
    }

    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const chatQuery: any = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (allowedAgentIds.length > 0 && user.role !== UserRole.ADMIN) {
      chatQuery.agentId = { $in: allowedAgentIds };
    }

    if (filters.domain) {
      chatQuery.domain = filters.domain;
    }

    const chatSessions = await this.chatSessionModel
      .find(chatQuery)
      .populate({
        path: 'customerId',
        model: Customer.name,
        select: 'metadata',
      })
      .populate({
        path: 'agentId',
        model: User.name,
        select: 'firstName lastName email',
      })
      .lean()
      .exec();

    const appointmentMap = new Map<string, AppointmentDocument>();
    if (
      filters.type === AnalyticsType.BOTH ||
      filters.type === AnalyticsType.APPOINTMENTS
    ) {
      const appointments = await this.appointmentModel
        .find({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .lean()
        .exec();

      appointments.forEach((apt) => {
        appointmentMap.set(apt.chatSessionId.toString(), apt);
      });
    }

    const attributedChats = chatSessions.map((session) => {
      const customer = session.customerId as any;
      const currentPageUrl =
        (session as any).sourceUrl ||
        customer?.metadata?.currentPageUrl ||
        'unknown_page';
      const attribution = (session as any).trafficSource
        ? {
            source: (session as any).trafficSource,
            domain: (session as any).domain,
          }
        : this.attributionService.parseUrl(currentPageUrl);
      const appointment = appointmentMap.get(session._id.toString());

      return {
        ...session,
        attribution,
        appointment,
      };
    });

    if (filters.conversionOnly) {
      return this.buildConversionOnlyResponse(
        attributedChats,
        filters,
        appointmentMap,
      );
    }

    return this.buildSummaryAndDetails(attributedChats, filters);
  }

  private buildSummaryAndDetails(
    attributedChats: any[],
    filters: GetAttributionDto,
  ): GetAttributionResponseDto {
    let filtered = [...attributedChats];

    if (filters.source) {
      filtered = filtered.filter(
        (chat) => chat.attribution.source === filters.source,
      );
    }

    if (filters.domain) {
      filtered = filtered.filter(
        (chat) => chat.attribution.domain === filters.domain,
      );
    }

    const sourceStats = this.buildSourceStats(filtered);
    const summary = this.buildSummary(sourceStats, filtered);

    let detailed = this.buildDetailedRecords(filtered);
    const total = detailed.length;

    if (filters.sortBy) {
      detailed = this.sortDetails(
        detailed,
        filters.sortBy,
        filters.sortOrder || 'desc',
      );
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIdx = (page - 1) * limit;
    const items = detailed.slice(startIdx, startIdx + limit);
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      summary,
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  private buildConversionOnlyResponse(
    attributedChats: any[],
    filters: GetAttributionDto,
    appointmentMap: Map<string, AppointmentDocument>,
  ): GetAttributionResponseDto {
    const chatsWithAppointments = attributedChats.filter((chat) =>
      appointmentMap.has(chat._id.toString()),
    );

    let filtered = [...chatsWithAppointments];

    if (filters.source) {
      filtered = filtered.filter(
        (chat) => chat.attribution.source === filters.source,
      );
    }

    if (filters.domain) {
      filtered = filtered.filter(
        (chat) => chat.attribution.domain === filters.domain,
      );
    }

    const sourceStats = this.buildSourceStats(filtered);
    const summary = this.buildSummary(sourceStats, filtered);

    let detailed = this.buildDetailedRecords(filtered);
    const total = detailed.length;

    if (filters.sortBy) {
      detailed = this.sortDetails(
        detailed,
        filters.sortBy,
        filters.sortOrder || 'desc',
      );
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIdx = (page - 1) * limit;
    const items = detailed.slice(startIdx, startIdx + limit);
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      summary,
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  private buildSourceStats(attributedChats: any[]): Map<string, any> {
    const stats = new Map<string, any>();

    attributedChats.forEach((chat) => {
      const source = chat.attribution.source;
      const hasAppointment = !!chat.appointment;

      if (!stats.has(source)) {
        stats.set(source, {
          chats: 0,
          appointments: 0,
        });
      }

      const sourceStat = stats.get(source);
      sourceStat.chats += 1;
      if (hasAppointment) {
        sourceStat.appointments += 1;
      }
    });

    return stats;
  }

  private buildSummary(
    sourceStats: Map<string, any>,
    attributedChats: any[],
  ): SummaryDto {
    let totalChats = 0;
    let totalAppointments = 0;

    const breakdown: SourceBreakdownDto[] = [];

    sourceStats.forEach((stat, source) => {
      totalChats += stat.chats;
      totalAppointments += stat.appointments;

      const conversionRate =
        stat.chats > 0
          ? ((stat.appointments / stat.chats) * 100).toFixed(2) + '%'
          : '0%';

      breakdown.push({
        source,
        chats: stat.chats,
        appointments: stat.appointments,
        conversionRate,
      });
    });

    const overallConversionRate =
      totalChats > 0
        ? ((totalAppointments / totalChats) * 100).toFixed(2) + '%'
        : '0%';

    breakdown.sort((a, b) => b.chats - a.chats);

    return {
      totalChats,
      totalAppointments,
      conversionRate: overallConversionRate,
      breakdown,
    };
  }

  private buildDetailedRecords(attributedChats: any[]): DetailedRecordDto[] {
    return attributedChats.map((chat) => {
      const agent = chat.agentId;
      const appointment = chat.appointment;
      const customerId = chat.customerId;

      return {
        chatSessionId: chat._id.toString(),
        customerId: (customerId?._id || customerId)?.toString() || '',
        agentId: agent?._id?.toString(),
        agentName: agent ? `${agent.firstName} ${agent.lastName}` : undefined,
        source: chat.attribution.source,
        domain: chat.attribution.domain,
        campaignName: chat.attribution.campaignName,
        createdAt: new Date(chat.createdAt).toISOString(),
        appointmentId: appointment?._id?.toString(),
        appointmentDate: appointment
          ? new Date(appointment.appointmentTime).toISOString()
          : undefined,
        appointmentStatus: appointment?.status,
      };
    });
  }

  private sortDetails(
    details: DetailedRecordDto[],
    sortBy: SortBy,
    order: 'asc' | 'desc',
  ): DetailedRecordDto[] {
    const sorted = [...details];
    const isAsc = order === 'asc';

    switch (sortBy) {
      case SortBy.CHATS:
        sorted.sort((a, b) =>
          isAsc
            ? a.chatSessionId.localeCompare(b.chatSessionId)
            : b.chatSessionId.localeCompare(a.chatSessionId),
        );
        break;
      case SortBy.DOMAIN:
        sorted.sort((a, b) =>
          isAsc
            ? a.domain.localeCompare(b.domain)
            : b.domain.localeCompare(a.domain),
        );
        break;
      case SortBy.SOURCE:
        sorted.sort((a, b) =>
          isAsc
            ? a.source.localeCompare(b.source)
            : b.source.localeCompare(a.source),
        );
        break;
      default:
        sorted.sort((a, b) =>
          isAsc
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }

    return sorted;
  }
}
