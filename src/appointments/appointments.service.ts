import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from 'src/schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UsersService } from 'src/users/users.service';
import { CustomersService } from 'src/customers/customers.service';
import { UserRole, AppointmentStatus } from 'src/shared/constants/enums';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { ChatSessionService } from 'src/chat/services/chat-session/chat-session.service';
import {
  ChatSession,
  ChatSessionDocument,
} from 'src/schemas/chat-session.schema';
import { AgentsService } from 'src/agents/agents.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    private readonly chatSessionService: ChatSessionService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
    @Inject(forwardRef(() => AgentsService))
    private readonly agentsService: AgentsService,
  ) {}

  async create(
    createDto: CreateAppointmentDto,
    chatSession: ChatSessionDocument,
    requestingUser: JwtPayload,
  ): Promise<AppointmentDocument> {
    let agentIdToAssign: Types.ObjectId;
    // if (requestingUser.role === UserRole.ADMIN) {
    //   if (!createDto.agentId) {
    //     throw new BadRequestException(
    //       'Agent ID is required for admin to book an appointment.',
    //     );
    //   }
    //   const agentUser = await this.usersService.findById(createDto.agentId);
    //   if (!agentUser || agentUser.role !== UserRole.AGENT) {
    //     throw new NotFoundException(
    //       `Agent with ID ${createDto.agentId} not found or is not an agent.`,
    //     );
    //   }
    //   agentIdToAssign = agentUser._id;
    // }
    if (
      requestingUser.role === UserRole.AGENT ||
      requestingUser.role === UserRole.ADMIN ||
      requestingUser.role === UserRole.MANAGER
    ) {
      agentIdToAssign = new Types.ObjectId(createDto.agentId);
      // Ensure agent is assigned to the chat or has permission
      if (
        chatSession.agentId &&
        chatSession.agentId.toString() !== agentIdToAssign.toString()
      ) {
        throw new ForbiddenException(
          'Agent is not assigned to this chat session.',
        );
      }
      // If chatSession.agentId is null, it means the chat might not be active or assigned yet.
      // This might be okay if an agent books an appointment from an offline message context.
      // For now, we allow it if the chatSession.agentId is null OR matches the requesting agent.
    } else {
      throw new ForbiddenException(
        'User role not authorized to book appointments.',
      );
    }

    const appointment = new this.appointmentModel({
      ...createDto,
      agentId: agentIdToAssign,
      customerId: chatSession.customerId, // ensure it's ObjectId
      chatSessionId: chatSession._id, // ensure it's ObjectId
    });
    return appointment.save();
  }

  async findAll(
    filters: {
      agentId?: string;
      customerId?: string;
      status?: AppointmentStatus;
    },
    adminId?: string,
  ): Promise<AppointmentDocument[]> {
    const query: any = {};
    if (filters.agentId) query.agentId = new Types.ObjectId(filters.agentId);
    if (filters.customerId)
      query.customerId = new Types.ObjectId(filters.customerId);
    if (filters.status) query.status = filters.status;

    // If adminId is provided, we need to filter appointments by agents belonging to this admin
    // This requires a lookup to agent profiles to get agents with matching adminId
    if (adminId) {
      // First, get all agent profiles that belong to this admin
      const agentProfiles =
        await this.agentsService.getAllAgentProfilesWithUserDetails(adminId);
      const agentUserIds = agentProfiles.map((profile) => profile.userId);

      // Filter appointments to only include those with agents from this admin
      if (agentUserIds.length > 0) {
        // If a specific agentId filter was provided, ensure it's in the allowed list
        if (filters.agentId) {
          const requestedAgentId = filters.agentId;
          const isAgentAllowed = agentUserIds.some(
            (id) => id.toString() === requestedAgentId,
          );
          if (!isAgentAllowed) {
            // Requested agent doesn't belong to this admin, return empty
            return [];
          }
          // Keep the specific agentId filter
        } else {
          // No specific agent requested, filter by all agents of this admin
          query.agentId = { $in: agentUserIds };
        }
      } else {
        // If no agents found for this admin, return empty array
        return [];
      }
    }

    return this.appointmentModel
      .find(query)
      .populate('agentId', 'firstName lastName email')
      .populate('customerId', 'name email')
      .populate('chatSessionId', 'initialMessage')
      .sort({ appointmentTime: -1 })
      .exec();
  }

  async findById(id: string): Promise<AppointmentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID format');
    }
    const appointment = await this.appointmentModel
      .findById(id)
      .populate('agentId', 'firstName lastName email')
      .populate('customerId', 'name email')
      .populate('chatSessionId', 'initialMessage')
      .exec();
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
    return appointment;
  }

  async findForAgent(agentId: string): Promise<AppointmentDocument[]> {
    return this.findAll({ agentId });
  }

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    requestingUser: JwtPayload,
  ): Promise<AppointmentDocument> {
    const appointment = await this.findById(id);

    // Authorization: Only assigned agent or admin/manager can update status
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.role !== UserRole.MANAGER &&
      appointment.agentId.toString() !== requestingUser.sub
    ) {
      throw new ForbiddenException(
        'You are not authorized to update this appointment.',
      );
    }

    appointment.status = status;
    return appointment.save();
  }

  // Optional: Cancel or Reschedule methods
  async cancel(
    id: string,
    requestingUser: JwtPayload,
  ): Promise<AppointmentDocument> {
    return this.updateStatus(id, AppointmentStatus.CANCELLED, requestingUser);
  }
}
