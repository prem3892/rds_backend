import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { GetUser } from '../shared/decorators/get-user.decorator';
import { UserRole } from '../shared/constants/enums';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { BlockCustomerDto, UnblockCustomerDto } from './dto/block-customer.dto';
import {
  BlockedCustomersListResponseDto,
  BlockCustomerResponseDto,
  UnblockCustomerResponseDto,
} from './dto/customer-responses.dto';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
} from '../shared/dto/common-responses.dto';
import { Types } from 'mongoose';

@ApiTags('Block Customer Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('block-customer')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get list of blocked customers (Admin only)',
    description:
      'Retrieves a comprehensive list of all customers that have been blocked by administrators. This endpoint provides detailed information about each blocked customer including who blocked them and when.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of blocked customers retrieved successfully',
    type: BlockedCustomersListResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin access required',
    type: ForbiddenResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description:
      'Internal server error occurred while retrieving blocked customers',
    type: ErrorResponseDto,
  })
  async getBlockedCustomers(
    @GetUser() user: JwtPayload,
  ): Promise<BlockedCustomersListResponseDto> {
    try {
      const customers = await this.customersService.getBlockedCustomers(
        new Types.ObjectId(user.sub),
        user.role,
      );
      return {
        customers: customers.map((customer) => ({
          _id: customer._id,
          fingerprint: customer.fingerprint,
          name: customer.name,
          email: customer.email,
          widgetId: customer.widgetId,
          isBlocked: customer.isBlocked,
          blockedBy: customer.blockedBy,
          blockedAt: customer.blockedAt,
          metadata: customer.metadata,
          createdAt: customer.createdAt,
        })),
        total: customers.length,
      };
    } catch (error) {
      if (error.name === 'ForbiddenException' || error.status === 403) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to retrieve blocked customers',
      );
    }
  }

  @Post('block')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Block a customer (Admin and Agent)',
    description:
      'Blocks a customer from accessing the chat system. Once blocked, the customer will not be able to connect to widgets, initiate chats, or send messages. The blocking action is logged with the user who performed it and the timestamp. Admins can block customers from widgets they created, agents can block customers from widgets created by their admin.',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer blocked successfully',
    type: BlockCustomerResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Bad Request - Invalid customer ID format or customer already blocked',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin access required',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
    type: NotFoundResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while blocking customer',
    type: ErrorResponseDto,
  })
  async blockCustomer(
    @Body() blockCustomerDto: BlockCustomerDto,
    @GetUser() user: JwtPayload,
  ): Promise<BlockCustomerResponseDto> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(blockCustomerDto.customerId)) {
        throw new BadRequestException('Invalid customer ID format');
      }

      const customer = await this.customersService.blockCustomer(
        blockCustomerDto.customerId,
        new Types.ObjectId(user.sub),
        user.role,
      );

      return {
        message: 'Customer blocked successfully',
        customer: {
          _id: customer._id,
          fingerprint: customer.fingerprint,
          name: customer.name,
          email: customer.email,
          widgetId: customer.widgetId,
          isBlocked: customer.isBlocked,
          blockedBy: customer.blockedBy,
          blockedAt: customer.blockedAt,
          metadata: customer.metadata,
          createdAt: customer.createdAt,
        },
      };
    } catch (error) {
      if (error.message === 'Customer is already blocked') {
        throw new BadRequestException('Customer is already blocked');
      }
      if (error.name === 'ForbiddenException' || error.status === 403) {
        throw error;
      }
      if (error.name === 'NotFoundException' || error.status === 404) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to block customer');
    }
  }

  @Post('unblock')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Unblock a customer (Admin and Agent)',
    description:
      'Removes the block from a previously blocked customer, restoring their access to the chat system. The customer will be able to connect to widgets, initiate chats, and send messages again. The unblocking action clears all blocking-related metadata. Admins can unblock customers from widgets they created, agents can unblock customers from widgets created by their admin.',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer unblocked successfully',
    type: UnblockCustomerResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Bad Request - Invalid customer ID format or customer is not currently blocked',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin access required',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Customer not found',
    type: NotFoundResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while unblocking customer',
    type: ErrorResponseDto,
  })
  async unblockCustomer(
    @Body() unblockCustomerDto: UnblockCustomerDto,
    @GetUser() user: JwtPayload,
  ): Promise<UnblockCustomerResponseDto> {
    try {
      // Validate ObjectId format
      if (!Types.ObjectId.isValid(unblockCustomerDto.customerId)) {
        throw new BadRequestException('Invalid customer ID format');
      }

      const customer = await this.customersService.unblockCustomer(
        unblockCustomerDto.customerId,
        new Types.ObjectId(user.sub),
        user.role,
      );

      return {
        message: 'Customer unblocked successfully',
        customer: {
          _id: customer._id,
          fingerprint: customer.fingerprint,
          name: customer.name,
          email: customer.email,
          widgetId: customer.widgetId,
          isBlocked: customer.isBlocked,
          blockedBy: customer.blockedBy,
          blockedAt: customer.blockedAt,
          metadata: customer.metadata,
          createdAt: customer.createdAt,
        },
      };
    } catch (error) {
      if (error.message === 'Customer is not blocked') {
        throw new BadRequestException('Customer is not blocked');
      }
      if (error.name === 'ForbiddenException' || error.status === 403) {
        throw error;
      }
      if (error.name === 'NotFoundException' || error.status === 404) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to unblock customer');
    }
  }
}
