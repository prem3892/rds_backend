import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { GetContactsDto } from './dto/get-contacts.dto';
import { ContactResponseDto } from './dto/contact-responses.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { UserRole } from '../shared/constants/enums';
import { Types } from 'mongoose';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  SuccessMessageResponseDto,
  PaginatedResponseDto,
} from '../shared/dto/common-responses.dto';

@ApiTags('Contacts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Create a new contact',
    description: 'Create a new contact associated with a customer.',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact created successfully',
    type: ContactResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or contact already exists',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
    type: NotFoundResponseDto,
  })
  create(
    @Body() createContactDto: CreateContactDto,
    @GetUser()
    user: { sub: string; email: string; role: UserRole; type: string },
  ) {
    return this.contactsService.create(
      createContactDto,
      new Types.ObjectId(user.sub),
    );
  }

  @Get()
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get contacts with pagination and filtering',
    description:
      'Retrieve contacts with support for pagination, search by name/email, filtering by customer, and sorting options.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contacts retrieved successfully',
    type: PaginatedResponseDto<ContactResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  findAll(
    @Query() queryDto: GetContactsDto,
    @GetUser()
    user: { sub: string; email: string; role: UserRole; type: string },
  ) {
    return this.contactsService.findAll(queryDto, {
      _id: new Types.ObjectId(user.sub),
      role: user.role,
    });
  }

  @Get(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get a contact by ID',
    description:
      'Retrieve a specific contact by its ID with populated customer information.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact retrieved successfully',
    type: ContactResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid contact ID format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Contact not found',
    type: NotFoundResponseDto,
  })
  findOne(
    @Param('id') id: string,
    @GetUser()
    user: { sub: string; email: string; role: UserRole; type: string },
  ) {
    return this.contactsService.findOne(id, {
      _id: new Types.ObjectId(user.sub),
      role: user.role,
    });
  }

  @Patch(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update a contact',
    description:
      'Update a contact by its ID. Cannot change the associated customer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact updated successfully',
    type: ContactResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or contact ID format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Contact not found',
    type: NotFoundResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @GetUser()
    user: { sub: string; email: string; role: UserRole; type: string },
  ) {
    return this.contactsService.update(id, updateContactDto, {
      _id: new Types.ObjectId(user.sub),
      role: user.role,
    });
  }

  @Delete(':id')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Delete a contact',
    description: 'Delete a contact by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact deleted successfully',
    type: SuccessMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid contact ID format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Contact not found',
    type: NotFoundResponseDto,
  })
  async remove(
    @Param('id') id: string,
    @GetUser()
    user: { sub: string; email: string; role: UserRole; type: string },
  ) {
    await this.contactsService.remove(id, {
      _id: new Types.ObjectId(user.sub),
      role: user.role,
    });
    return { message: 'Contact deleted successfully' };
  }

  @Get('customer/:customerId')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get contacts by customer ID',
    description: 'Retrieve all contacts associated with a specific customer.',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Customer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contacts retrieved successfully',
    type: [ContactResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Invalid customer ID format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  findByCustomer(
    @Param('customerId') customerId: string,
    @GetUser()
    user: { sub: string; email: string; role: UserRole; type: string },
  ) {
    return this.contactsService.findByCustomer(customerId, {
      _id: new Types.ObjectId(user.sub),
      role: user.role,
    });
  }
}
