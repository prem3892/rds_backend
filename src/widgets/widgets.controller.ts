import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Res,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Inject,
  Query,
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
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { WidgetsService } from './widgets.service';
import { UpdateWidgetDto } from './dto/update-widget.dto';

import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { Types } from 'mongoose';
import { CreateWidgetDto } from 'src/departments/dto/create-widget.dto';
import { ConfigService } from '@nestjs/config';
import { generateWidgetScript } from './widget-script.template';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  SuccessMessageResponseDto,
  PaginatedResponseDto,
} from '../shared/dto/common-responses.dto';

import {
  WidgetResponseDto,
  WidgetPublicConfigResponseDto,
} from './dto/widget-responses.dto';
import { GetWidgetsQueryDto } from './dto/get-widgets-query.dto';
import { AutoMessagesService } from './auto-messages.service';
import { CreateAutoMessageDto } from './dto/create-auto-message.dto';
import { UpdateAutoMessageDto } from './dto/update-auto-message.dto';
import { GetAutoMessagesDto } from './dto/get-auto-messages.dto';
import { AutoMessageResponseDto } from './dto/auto-message-responses.dto';
import { AdminResolverUtil } from '../shared/utils/admin-resolver.util';
import { AgentsService } from '../agents/agents.service';

@ApiTags('Widgets')
@Controller('widgets')
export class WidgetsController {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  constructor(
    private readonly widgetsService: WidgetsService,
    private readonly autoMessagesService: AutoMessagesService,
    private readonly agentsService: AgentsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new chat widget (Admin/Manager only)',
    description:
      'Create a new embeddable chat widget with customizable settings and department routing',
  })
  @ApiResponse({
    status: 201,
    description: 'Widget created successfully',
    type: WidgetResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin or Manager role required',
    type: ForbiddenResponseDto,
  })
  async create(
    @Body() createWidgetDto: CreateWidgetDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.widgetsService.create(createWidgetDto, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get widgets with pagination and filtering (Admin/Manager only)',
    description:
      'Retrieve widgets with pagination, search, and filtering options. Only returns widgets created by the authenticated admin or manager.',
  })
  @ApiResponse({
    status: 200,
    description: 'Widgets retrieved successfully',
    type: PaginatedResponseDto<WidgetResponseDto>,
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
    description: 'Admin or Manager role required',
    type: ForbiddenResponseDto,
  })
  async findAll(
    @Query() query: GetWidgetsQueryDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.widgetsService.findAllByAdminPaginated(adminId, query);
  }

  // Admin endpoint to get full config for a widget
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get(':widgetId/config')
  async findOneForAdmin(
    @Param('widgetId') widgetId: string,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    if (!Types.ObjectId.isValid(widgetId)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.widgetsService.findByIdAndAdmin(widgetId, adminId);
  }

  @Get(':widgetId/script.js')
  @ApiOperation({
    summary: 'Get widget JavaScript embed script (Public)',
    description:
      'Retrieve the JavaScript code to embed the chat widget on a website. This is a public endpoint that does not require authentication.',
  })
  @ApiParam({
    name: 'widgetId',
    description: 'Widget unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiProduces('application/javascript')
  @ApiResponse({
    status: 200,
    description: 'Widget script retrieved successfully',
    content: {
      'application/javascript': {
        example: '(function(){/* Widget embed script */})();',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid widget ID format',
  })
  @ApiNotFoundResponse({
    description: 'Widget not found or not enabled',
  })
  async getWidgetScript(
    @Param('widgetId') widgetId: string,
    @Res() res: Response,
  ) {
    if (!Types.ObjectId.isValid(widgetId)) {
      res.status(HttpStatus.BAD_REQUEST).send('Invalid widget ID format');
      return;
    }
    const widget = await this.widgetsService.findByIdPublic(widgetId);
    if (!widget) {
      res.status(HttpStatus.NOT_FOUND).send('Widget not found or not enabled.');
      return;
    }

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

    const url = this.configService.get<string>('internal.baseurl');

    if (!url) {
      throw new Error('Base URL not configured');
    }

    const script = generateWidgetScript(widgetId, url);

    res.send(script);
  }

  // Public endpoint for widget configuration (JSON)
  @Get(':widgetId/public-config')
  @ApiOperation({
    summary: 'Get widget public configuration (Public)',
    description:
      'Retrieve public configuration for a widget including settings, departments, and auto messages. Used by the widget script to initialize the chat widget.',
  })
  @ApiParam({
    name: 'widgetId',
    description: 'Widget unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Widget public configuration retrieved successfully',
    type: WidgetPublicConfigResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid widget ID format',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Widget not found or not enabled',
    type: NotFoundResponseDto,
  })
  async getWidgetPublicConfig(
    @Param('widgetId') widgetId: string,
    @Res() res: Response,
  ) {
    if (!Types.ObjectId.isValid(widgetId)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    const widgetPublicData = await this.widgetsService.findByIdPublic(widgetId);
    if (!widgetPublicData) {
      throw new NotFoundException('Widget not found or not enabled.');
    }

    // TODO: Add domain and path query parameters to filter auto messages
    // For now, we're including all auto messages for the widget
    const autoMessages =
      await this.autoMessagesService.findAllAutoMessagesForWidget(widgetId);

    // Expose only necessary fields for the public widget script
    const publicConfig = {
      widgetId: widgetPublicData._id?.toString() ?? '',
      name: widgetPublicData.name,
      departments: (widgetPublicData.departmentIds ?? []).map((dep: any) => ({
        id: dep._id.toString(),
        name: dep.name,
      })), // Assuming departmentIds is populated
      widgetConfig: {
        primaryColor: widgetPublicData.primaryColor,
        secondaryColor: widgetPublicData.secondaryColor,
        theme: widgetPublicData.theme,
        welcomeMessage: widgetPublicData.welcomeMessage,
        headerText: widgetPublicData.headerText,
        offline_text: widgetPublicData.offline_text,
        button_location: widgetPublicData.button_location,
        button_label: widgetPublicData.button_label,
        widget_text_color: widgetPublicData.widget_text_color,
      },
      autoMessages: autoMessages.map((msg) => ({
        id: msg._id?.toString(),
        title: msg.title,
        message: msg.message,
        domain: msg.domain,
        sitewide: msg.sitewide,
        pagePaths: msg.pagePaths,
        showAfterSeconds: msg.showAfterSeconds,
      })),
      // Add socket endpoint, etc.
      socketUrl: '/', // Or your specific WebSocket server URL
      socketNamespace: '/chat',
    };
    return res.status(HttpStatus.OK).json(publicConfig);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get(':id') // This can be the same as :widgetId/config if you prefer to have one endpoint for admin
  async findOne(
    @Param('id') id: string,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.widgetsService.findByIdAndAdmin(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWidgetDto: UpdateWidgetDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.widgetsService.updateByAdmin(id, updateWidgetDto, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete(':id')
  async remove(@Param('id') id: string, @AuthenticatedUser() user: JwtPayload) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    const adminId = await AdminResolverUtil.resolveAdminIdAsObjectId(
      user,
      this.agentsService,
    );
    return this.widgetsService.removeByAdmin(id, adminId);
  }

  // Public endpoint to get auto messages for a widget
  @Get(':widgetId/auto-messages')
  @ApiOperation({
    summary: 'Get auto messages for widget (Public)',
    description:
      'Retrieve auto messages for a specific widget and domain. Used by the widget script.',
  })
  @ApiParam({
    name: 'widgetId',
    description: 'Widget unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'domain',
    description: 'Domain to filter auto messages',
    example: 'example.com',
    required: true,
  })
  @ApiQuery({
    name: 'path',
    description: 'Current page path (optional)',
    example: 'about-us',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Auto messages retrieved successfully',
    type: [AutoMessageResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Invalid widget ID format or missing domain',
  })
  async getWidgetAutoMessages(
    @Param('widgetId') widgetId: string,
    @Query('domain') domain: string,
    @Query('path') path?: string,
  ) {
    if (!Types.ObjectId.isValid(widgetId)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    if (!domain) {
      throw new BadRequestException('Domain parameter is required');
    }
    return this.autoMessagesService.findPublicAutoMessages(
      widgetId,
      domain,
      path,
    );
  }
}
