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
@Roles(UserRole.ADMIN)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.departmentsService.create(
      createDepartmentDto,
      new Types.ObjectId(user.sub),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all departments (Admin only)',
    description:
      'Retrieve all departments created by the authenticated admin user.',
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
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  findAll(@AuthenticatedUser() user: JwtPayload) {
    return this.departmentsService.findAllByAdmin(new Types.ObjectId(user.sub));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @AuthenticatedUser() user: JwtPayload) {
    return this.departmentsService.findByIdAndAdmin(
      id,
      new Types.ObjectId(user.sub),
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.departmentsService.updateByAdmin(
      id,
      updateDepartmentDto,
      new Types.ObjectId(user.sub),
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @AuthenticatedUser() user: JwtPayload) {
    return this.departmentsService.removeByAdmin(
      id,
      new Types.ObjectId(user.sub),
    );
  }
}
