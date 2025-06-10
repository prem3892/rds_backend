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
} from '@nestjs/common';
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

@Controller('widgets')
export class WidgetsController {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  constructor(private readonly widgetsService: WidgetsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Body() createWidgetDto: CreateWidgetDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.widgetsService.create(
      createWidgetDto,
      new Types.ObjectId(user.sub),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.widgetsService.findAll();
  }

  // Admin endpoint to get full config for a widget
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':widgetId/config')
  findOneForAdmin(@Param('widgetId') widgetId: string) {
    if (!Types.ObjectId.isValid(widgetId)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.findById(widgetId);
  }

  // Public endpoint for widget script loader
  @Get(':widgetId/script.js')
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
        welcomeMessage: widgetPublicData.welcomeMessage,
        headerText: widgetPublicData.headerText,
      },
      // Add socket endpoint, etc.
      socketUrl: '/', // Or your specific WebSocket server URL
      socketNamespace: '/chat',
    };
    return res.status(HttpStatus.OK).json(publicConfig);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id') // This can be the same as :widgetId/config if you prefer to have one endpoint for admin
  findOne(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateWidgetDto: UpdateWidgetDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.update(id, updateWidgetDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid widget ID format');
    }
    return this.widgetsService.remove(id);
  }
}
