import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole, AppointmentStatus } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { IsEnum } from 'class-validator';
import { Types } from 'mongoose';
import { AgentsService } from '../agents/agents.service';
import { AdminResolverUtil } from '../shared/utils/admin-resolver.util';

class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly agentsService: AgentsService,
  ) {}

  // Agent or Admin books an appointment
  // @Post()
  // @Roles(UserRole.ADMIN, UserRole.AGENT)
  // create(
  //   @Body() createAppointmentDto: CreateAppointmentDto,
  //   @AuthenticatedUser() user: JwtPayload,
  // ) {
  //   return this.appointmentsService.create(createAppointmentDto, user);
  // }

  // Admin: View all appointments, filterable
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAllByAdmin(
    @AuthenticatedUser() user: JwtPayload,
    @Query('agentId') agentId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    // Resolve adminId for both ADMIN and MANAGER roles
    const adminId = await AdminResolverUtil.resolveAdminId(
      user,
      this.agentsService,
    );

    const filters: any = {};
    if (agentId) {
      if (!Types.ObjectId.isValid(agentId))
        throw new BadRequestException('Invalid agentId format');
      filters.agentId = agentId;
    }
    if (customerId) {
      if (!Types.ObjectId.isValid(customerId))
        throw new BadRequestException('Invalid customerId format');
      filters.customerId = customerId;
    }
    if (status) filters.status = status;

    // Pass adminId to service to filter appointments by agents belonging to this admin
    return this.appointmentsService.findAll(filters, adminId);
  }

  // Agent: View their own appointments
  @Get('my')
  @Roles(UserRole.AGENT)
  findMyAgentAppointments(@AuthenticatedUser() user: JwtPayload) {
    return this.appointmentsService.findForAgent(user.sub);
  }

  // Admin/Agent: View specific appointment
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  async findOne(
    @Param('id') id: string,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    const appointment = await this.appointmentsService.findById(id);

    // Agent can only see their own appointments
    if (
      user.role === UserRole.AGENT &&
      appointment.agentId.toString() !== user.sub
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this appointment.',
      );
    }

    // Admin/Manager can only see appointments for agents they manage
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      const adminId = await AdminResolverUtil.resolveAdminId(
        user,
        this.agentsService,
      );

      // Check if the agent belongs to this admin
      const agentProfile = await this.agentsService.findAgentProfileByUserId(
        appointment.agentId.toString(),
      );

      if (!agentProfile || agentProfile.adminId.toString() !== adminId) {
        throw new ForbiddenException(
          'You do not have permission to view this appointment.',
        );
      }
    }

    return appointment;
  }

  // Admin/Agent: Update appointment status (e.g., to COMPLETED or CANCELLED)
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentStatusDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    // For ADMIN/MANAGER, verify they can access this appointment
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      const adminId = await AdminResolverUtil.resolveAdminId(
        user,
        this.agentsService,
      );

      const appointment = await this.appointmentsService.findById(id);
      const agentProfile = await this.agentsService.findAgentProfileByUserId(
        appointment.agentId.toString(),
      );

      if (!agentProfile || agentProfile.adminId.toString() !== adminId) {
        throw new ForbiddenException(
          'You do not have permission to update this appointment.',
        );
      }
    }

    return this.appointmentsService.updateStatus(id, body.status, user);
  }
}
