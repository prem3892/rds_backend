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

class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

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
  findAllByAdmin(
    @Query('agentId') agentId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
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
    return this.appointmentsService.findAll(filters);
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
    // Agent can only see their own appointments unless admin or manager
    if (
      user.role === UserRole.AGENT &&
      appointment.agentId.toString() !== user.sub
    ) {
      throw new ForbiddenException(
        'You do not have permission to view this appointment.',
      );
    }
    return appointment;
  }

  // Admin/Agent: Update appointment status (e.g., to COMPLETED or CANCELLED)
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentStatusDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.appointmentsService.updateStatus(id, body.status, user);
  }
}
