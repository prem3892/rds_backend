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

@Controller('widgets')
export class WidgetsController {
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

    // This is a placeholder. In a real app, you'd serve an actual JS file.
    // The script would then fetch /widgets/:widgetId/public-config
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
      console.log("Widget script loader for widgetId: ${widgetId}");
      // Fetch public config and initialize UI
      (async () => {
        try {
          const response = await fetch('/widgets/${widgetId}/public-config');
          if (!response.ok) throw new Error('Failed to load widget config');
          const config = await response.json();
          console.log("Widget config:", config);
          // Example: Apply primary color
          if (config.widgetConfig && config.widgetConfig.primaryColor) {
            // document.documentElement.style.setProperty('--chat-widget-primary-color', config.widgetConfig.primaryColor);
          }
          // TODO: Implement actual widget UI initialization here
          // Connect to WebSocket, display chat button, etc.
        } catch (error) {
          console.error("Error loading widget:", error);
        }
      })();
    `);
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
