import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    private readonly chatSessionService: ChatSessionService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
  ) {}

  async create(
    createDto: CreateAppointmentDto,
    requestingUser: JwtPayload,
  ): Promise<AppointmentDocument> {
    const chatSession = await this.chatSessionService.findById(
      createDto.chatSessionId,
    );
    if (!chatSession) {
      throw new NotFoundException(
        `Chat session with ID ${createDto.chatSessionId} not found.`,
      );
    }

    const customer = await this.customersService.findById(createDto.customerId);
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createDto.customerId} not found.`,
      );
    }
    if (chatSession.customerId.toString() !== customer._id.toString()) {
      throw new BadRequestException(
        'Customer ID does not match the customer in the chat session.',
      );
    }

    let agentIdToAssign: Types.ObjectId;
    if (requestingUser.role === UserRole.ADMIN) {
      if (!createDto.agentId) {
        throw new BadRequestException(
          'Agent ID is required for admin to book an appointment.',
        );
      }
      const agentUser = await this.usersService.findById(createDto.agentId);
      if (!agentUser || agentUser.role !== UserRole.AGENT) {
        throw new NotFoundException(
          `Agent with ID ${createDto.agentId} not found or is not an agent.`,
        );
      }
      agentIdToAssign = agentUser._id;
    } else if (requestingUser.role === UserRole.AGENT) {
      agentIdToAssign = new Types.ObjectId(requestingUser.sub);
      // Ensure agent is assigned to the chat or has permission
      if (
        chatSession.agentId &&
        chatSession.agentId.toString() !== requestingUser.sub
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
      customerId: customer._id, // ensure it's ObjectId
      chatSessionId: chatSession._id, // ensure it's ObjectId
    });
    return appointment.save();
  }

  async findAll(filters: {
    agentId?: string;
    customerId?: string;
    status?: AppointmentStatus;
  }): Promise<AppointmentDocument[]> {
    const query: any = {};
    if (filters.agentId) query.agentId = new Types.ObjectId(filters.agentId);
    if (filters.customerId)
      query.customerId = new Types.ObjectId(filters.customerId);
    if (filters.status) query.status = filters.status;

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

    // Authorization: Only assigned agent or admin can update status
    if (
      requestingUser.role !== UserRole.ADMIN &&
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
