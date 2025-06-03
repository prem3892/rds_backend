import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from '../shared/constants/enums';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
declare class UpdateAppointmentStatusDto {
    status: AppointmentStatus;
}
export declare class AppointmentsController {
    private readonly appointmentsService;
    constructor(appointmentsService: AppointmentsService);
    create(createAppointmentDto: CreateAppointmentDto, user: JwtPayload): Promise<import("../schemas/appointment.schema").AppointmentDocument>;
    findAllByAdmin(agentId?: string, customerId?: string, status?: AppointmentStatus): Promise<import("../schemas/appointment.schema").AppointmentDocument[]>;
    findMyAgentAppointments(user: JwtPayload): Promise<import("../schemas/appointment.schema").AppointmentDocument[]>;
    findOne(id: string, user: JwtPayload): Promise<import("../schemas/appointment.schema").AppointmentDocument>;
    updateStatus(id: string, body: UpdateAppointmentStatusDto, user: JwtPayload): Promise<import("../schemas/appointment.schema").AppointmentDocument>;
}
export {};
