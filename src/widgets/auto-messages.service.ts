import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AutoMessage,
  AutoMessageDocument,
} from '../schemas/auto-message.schema';
import { CreateAutoMessageDto } from './dto/create-auto-message.dto';
import { UpdateAutoMessageDto } from './dto/update-auto-message.dto';
import { GetAutoMessagesDto } from './dto/get-auto-messages.dto';
import { WidgetsService } from './widgets.service';

@Injectable()
export class AutoMessagesService {
  private readonly logger = new Logger(AutoMessagesService.name);

  constructor(
    @InjectModel(AutoMessage.name)
    private autoMessageModel: Model<AutoMessageDocument>,
    private readonly widgetsService: WidgetsService,
  ) {}

  async create(
    createDto: CreateAutoMessageDto,
    createdBy: Types.ObjectId,
  ): Promise<AutoMessageDocument> {
    // Verify widget exists and user has access to it
    const widget = await this.widgetsService.findByIdAndAdmin(
      createDto.widgetId,
      createdBy,
    );
    if (!widget) {
      throw new NotFoundException('Widget not found or access denied');
    }

    // Validate domain exists in widget's domains array
    if (!widget.domains.includes(createDto.domain)) {
      throw new BadRequestException(
        `Domain '${createDto.domain}' is not configured for this widget`,
      );
    }

    // If not sitewide, pagePaths should not be empty
    if (
      !createDto.sitewide &&
      (!createDto.pagePaths || createDto.pagePaths.length === 0)
    ) {
      throw new BadRequestException(
        'Page paths are required when sitewide is false',
      );
    }

    const autoMessage = new this.autoMessageModel({
      ...createDto,
      widgetId: new Types.ObjectId(createDto.widgetId),
      createdBy,
    });

    return autoMessage.save();
  }

  async findAll(
    query: GetAutoMessagesDto,
    createdBy: Types.ObjectId,
  ): Promise<{
    items: AutoMessageDocument[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const filter: any = { createdBy };

    if (query.widgetId) {
      // Verify user has access to this widget
      const widget = await this.widgetsService.findByIdAndAdmin(
        query.widgetId,
        createdBy,
      );
      if (!widget) {
        throw new ForbiddenException('Access denied to this widget');
      }
      filter.widgetId = new Types.ObjectId(query.widgetId);
    }

    if (query.domain) {
      filter.domain = query.domain;
    }

    if (typeof query.isEnabled === 'boolean') {
      filter.isEnabled = query.isEnabled;
    }

    if (typeof query.sitewide === 'boolean') {
      filter.sitewide = query.sitewide;
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { message: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await this.autoMessageModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const items = await this.autoMessageModel
      .find(filter)
      .populate('widgetId', 'name domains')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findById(
    id: string,
    createdBy: Types.ObjectId,
  ): Promise<AutoMessageDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid auto message ID format');
    }

    const autoMessage = await this.autoMessageModel
      .findOne({ _id: id, createdBy })
      .populate('widgetId', 'name domains')
      .exec();

    if (!autoMessage) {
      throw new NotFoundException('Auto message not found');
    }

    return autoMessage;
  }

  async update(
    id: string,
    updateDto: UpdateAutoMessageDto,
    createdBy: Types.ObjectId,
  ): Promise<AutoMessageDocument> {
    const autoMessage = await this.findById(id, createdBy);

    // If widgetId is being updated, verify access
    if (updateDto.widgetId) {
      const widget = await this.widgetsService.findByIdAndAdmin(
        updateDto.widgetId,
        createdBy,
      );
      if (!widget) {
        throw new NotFoundException('Widget not found or access denied');
      }
    }

    // If domain is being updated, validate it exists in widget's domains
    if (updateDto.domain) {
      const widgetId = updateDto.widgetId || autoMessage.widgetId.toString();
      const widget = await this.widgetsService.findByIdAndAdmin(
        widgetId,
        createdBy,
      );
      if (!widget.domains.includes(updateDto.domain)) {
        throw new BadRequestException(
          `Domain '${updateDto.domain}' is not configured for this widget`,
        );
      }
    }

    // Validate sitewide and pagePaths relationship
    if (updateDto.sitewide !== undefined || updateDto.pagePaths !== undefined) {
      const sitewide =
        updateDto.sitewide !== undefined
          ? updateDto.sitewide
          : autoMessage.sitewide;
      const pagePaths =
        updateDto.pagePaths !== undefined
          ? updateDto.pagePaths
          : autoMessage.pagePaths;

      if (!sitewide && (!pagePaths || pagePaths.length === 0)) {
        throw new BadRequestException(
          'Page paths are required when sitewide is false',
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...updateDto };
    if (updateDto.widgetId) {
      updateData.widgetId = new Types.ObjectId(updateDto.widgetId);
    }

    // Use findByIdAndUpdate to avoid full document validation
    const updatedAutoMessage = await this.autoMessageModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true, // Only validate the fields being updated
      })
      .populate('widgetId', 'name domains')
      .exec();

    if (!updatedAutoMessage) {
      throw new NotFoundException('Auto message not found');
    }

    return updatedAutoMessage;
  }

  async remove(id: string, createdBy: Types.ObjectId): Promise<void> {
    const autoMessage = await this.findById(id, createdBy);
    await this.autoMessageModel.deleteOne({ _id: autoMessage._id }).exec();
  }

  /**
   * Public method to get auto messages for a specific widget and domain
   * Used by the widget script to display auto messages
   */
  async findPublicAutoMessages(
    widgetId: string,
    domain: string,
    currentPath?: string,
  ): Promise<AutoMessageDocument[]> {
    if (!Types.ObjectId.isValid(widgetId)) {
      return [];
    }

    const filter: any = {
      widgetId: new Types.ObjectId(widgetId),
      domain,
      isEnabled: true,
    };

    // If currentPath is provided, filter by sitewide or matching page paths
    if (currentPath) {
      filter.$or = [
        { sitewide: true },
        {
          sitewide: false,
          pagePaths: { $in: [currentPath] },
        },
      ];
    } else {
      // If no current path, only return sitewide messages
      filter.sitewide = true;
    }

    return this.autoMessageModel
      .find(filter)
      .select('title message sitewide pagePaths showAfterSeconds')
      .sort({ showAfterSeconds: 1 }) // Show messages with shorter delays first
      .exec();
  }

  /**
   * Get auto messages count for a specific widget
   */
  async getCountByWidget(
    widgetId: string,
    createdBy: Types.ObjectId,
  ): Promise<number> {
    if (!Types.ObjectId.isValid(widgetId)) {
      return 0;
    }

    // Verify user has access to this widget
    const widget = await this.widgetsService.findByIdAndAdmin(
      widgetId,
      createdBy,
    );
    if (!widget) {
      return 0;
    }

    return this.autoMessageModel
      .countDocuments({
        widgetId: new Types.ObjectId(widgetId),
        createdBy,
      })
      .exec();
  }
}
