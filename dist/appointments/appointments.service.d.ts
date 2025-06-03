import { Model } from 'mongoose';
import { AppointmentDocument } from 'src/schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UsersService } from 'src/users/users.service';
import { CustomersService } from 'src/customers/customers.service';
import { AppointmentStatus } from 'src/shared/constants/enums';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { ChatSessionService } from 'src/chat/services/chat-session/chat-session.service';
export declare class AppointmentsService {
    private appointmentModel;
    private readonly chatSessionService;
    private readonly usersService;
    private readonly customersService;
    constructor(appointmentModel: Model<AppointmentDocument>, chatSessionService: ChatSessionService, usersService: UsersService, customersService: CustomersService);
    create(createDto: CreateAppointmentDto, requestingUser: JwtPayload): Promise<AppointmentDocument>;
    findAll(filters: {
        agentId?: string;
        customerId?: string;
        status?: AppointmentStatus;
    }): Promise<AppointmentDocument[]>;
    findById(id: string): Promise<AppointmentDocument>;
    findForAgent(agentId: string): Promise<AppointmentDocument[]>;
    updateStatus(id: string, status: AppointmentStatus, requestingUser: JwtPayload): Promise<AppointmentDocument>;
    cancel(id: string, requestingUser: JwtPayload): Promise<AppointmentDocument>;
}
