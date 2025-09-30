import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { UserRole } from '../shared/constants/enums';
import { Types } from 'mongoose';
import { AuthenticatedUser } from 'src/shared/decorators/user.decorator';
import { JwtPayload } from 'src/shared/interfaces/jwt-payload.interface';
import { AdminResolverUtil } from '../shared/utils/admin-resolver.util';
import { AgentsService } from '../agents/agents.service';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  SuccessMessageResponseDto,
} from '../shared/dto/common-responses.dto';

@ApiTags('Departments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly agentsService: AgentsService,
  ) {}

  @Post()
  async create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.departmentsService.create(createDepartmentDto, adminId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all departments (Admin/Manager only)',
    description:
      'Retrieve all departments created by the authenticated admin or manager user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Departments retrieved successfully',
    // You might want to create a DepartmentResponseDto for proper typing
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin or Manager role required',
    type: ForbiddenResponseDto,
  })
  async findAll(@AuthenticatedUser() user: JwtPayload) {
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.departmentsService.findAllByAdmin(adminId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.departmentsService.findByIdAndAdmin(id, adminId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.departmentsService.updateByAdmin(
      id,
      updateDepartmentDto,
      adminId,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @AuthenticatedUser() user: JwtPayload) {
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.departmentsService.removeByAdmin(id, adminId);
  }
}
