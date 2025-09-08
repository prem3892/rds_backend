import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Widget, WidgetDocument } from 'src/schemas/widget.schema';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { DepartmentsService } from 'src/departments/departments.service';
import { ConfigService } from '@nestjs/config';
import { CreateWidgetDto } from 'src/departments/dto/create-widget.dto';
import { GetWidgetsQueryDto } from './dto/get-widgets-query.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../shared/dto/common-responses.dto';

@Injectable()
export class WidgetsService {
  private readonly appDomain: string;

  constructor(
    @InjectModel(Widget.name) private widgetModel: Model<WidgetDocument>,
    private readonly departmentsService: DepartmentsService,
    private readonly configService: ConfigService,
  ) {
    this.appDomain =
      this.configService.get<string>('appDomain') || 'http://localhost:8081';
  }

  private generateInjectableScriptUrl(
    widgetId: string | Types.ObjectId,
  ): string {
    const url = this.configService.get<string>('internal.baseurl');
    return `${url}/widgets/${widgetId.toString()}/script.js`;
  }

  async create(
    createWidgetDto: CreateWidgetDto,
    adminId: Types.ObjectId,
  ): Promise<WidgetDocument> {
    if (
      createWidgetDto.departmentIds &&
      createWidgetDto.departmentIds.length > 0
    ) {
      // Only validate departments that belong to the same admin
      const departments = await this.departmentsService.findAllByAdmin(adminId);
      const adminDepartmentIds = departments.map((dept) => dept._id.toString());
      const requestedDepartmentIds = createWidgetDto.departmentIds.map((id) =>
        id.toString(),
      );

      const invalidDepartments = requestedDepartmentIds.filter(
        (id) => !adminDepartmentIds.includes(id),
      );

      if (invalidDepartments.length > 0) {
        throw new BadRequestException(
          'One or more department IDs are invalid or do not belong to you.',
        );
      }
    }

    const newWidget = new this.widgetModel({
      ...createWidgetDto,
      createdBy: adminId,
    });
    newWidget.injectableScriptUrl = this.generateInjectableScriptUrl(
      newWidget._id,
    );
    return newWidget.save();
  }

  async findAll(): Promise<WidgetDocument[]> {
    return this.widgetModel.find().populate('departmentIds').exec();
  }

  async findAllByAdmin(adminId: Types.ObjectId): Promise<WidgetDocument[]> {
    return this.widgetModel
      .find({ createdBy: adminId })
      .populate('departmentIds')
      .exec();
  }

  async findAllByAdminPaginated(
    adminId: Types.ObjectId,
    query: GetWidgetsQueryDto,
  ): Promise<PaginatedResponseDto<WidgetDocument>> {
    const {
      search,
      isEnabled,
      departmentIds,
      domain,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build the filter object
    const filter: any = { createdBy: adminId };

    // Text search in name and domains
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domains: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by enabled status
    if (typeof isEnabled === 'boolean') {
      filter.isEnabled = isEnabled;
    }

    // Filter by department IDs
    if (departmentIds) {
      const departmentIdArray = departmentIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));

      if (departmentIdArray.length > 0) {
        filter.departmentIds = { $in: departmentIdArray };
      }
    }

    // Filter by domain
    if (domain) {
      filter.domains = { $regex: domain, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [items, total] = await Promise.all([
      this.widgetModel
        .find(filter)
        .populate('departmentIds')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.widgetModel.countDocuments(filter).exec(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      items,
      meta,
    };
  }

  /**
   * @param id The ID of the widget to retrieve. Can be either a string or ObjectId.
   * @returns Widget document with populated department details.
   */
  async findById(id: string | Types.ObjectId): Promise<WidgetDocument> {
    const widget = await this.widgetModel
      .findById(id)
      .populate('departmentIds')
      .exec();
    if (!widget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }
    return widget;
  }

  async findByIdAndAdmin(
    id: string | Types.ObjectId,
    adminId: Types.ObjectId,
  ): Promise<WidgetDocument> {
    const widget = await this.widgetModel
      .findOne({ _id: id, createdBy: adminId })
      .populate('departmentIds')
      .exec();
    if (!widget) {
      throw new NotFoundException(
        `Widget with ID ${id} not found or you don't have permission to access it`,
      );
    }
    return widget;
  }

  async findByIdPublic(
    id: string | Types.ObjectId,
  ): Promise<Partial<WidgetDocument> | null> {
    const widget = await this.widgetModel
      .findById(id)
      .select(
        'name domains departmentIds isEnabled primaryColor secondaryColor theme welcomeMessage headerText button_location button_label widget_text_color injectableScriptUrl',
      )
      .populate({ path: 'departmentIds', select: 'name _id' }) // Only name and id for public
      .exec();

    if (!widget || !widget.isEnabled) {
      return null;
    }
    return widget;
  }

  async update(
    id: string,
    updateWidgetDto: UpdateWidgetDto,
  ): Promise<WidgetDocument> {
    const widget = await this.findById(id); // Ensures widget exists

    if (
      updateWidgetDto.departmentIds &&
      updateWidgetDto.departmentIds.length > 0
    ) {
      const departments = await this.departmentsService.findByIds(
        updateWidgetDto.departmentIds,
      );
      if (departments.length !== updateWidgetDto.departmentIds.length) {
        throw new BadRequestException(
          'One or more department IDs are invalid.',
        );
      }
    }

    // If ID changes, script URL needs update - but ID won't change with findByIdAndUpdate
    // For simplicity, we keep injectableScriptUrl based on original _id.
    // If there was a way to change _id (not typical), this would need regeneration.

    const updatedWidget = await this.widgetModel
      .findByIdAndUpdate(id, { ...updateWidgetDto }, { new: true })
      .populate('departmentIds')
      .exec();

    if (!updatedWidget) {
      throw new NotFoundException(`Widget with ID ${id} not found for update.`);
    }
    return updatedWidget;
  }

  async updateByAdmin(
    id: string,
    updateWidgetDto: UpdateWidgetDto,
    adminId: Types.ObjectId,
  ): Promise<WidgetDocument> {
    const widget = await this.findByIdAndAdmin(id, adminId); // Ensures widget exists and belongs to admin

    if (
      updateWidgetDto.departmentIds &&
      updateWidgetDto.departmentIds.length > 0
    ) {
      // Only validate departments that belong to the same admin
      const departments = await this.departmentsService.findAllByAdmin(adminId);
      const adminDepartmentIds = departments.map((dept) => dept._id.toString());
      const requestedDepartmentIds = updateWidgetDto.departmentIds.map((id) =>
        id.toString(),
      );

      const invalidDepartments = requestedDepartmentIds.filter(
        (id) => !adminDepartmentIds.includes(id),
      );

      if (invalidDepartments.length > 0) {
        throw new BadRequestException(
          'One or more department IDs are invalid or do not belong to you.',
        );
      }
    }

    const updatedWidget = await this.widgetModel
      .findOneAndUpdate(
        { _id: id, createdBy: adminId },
        { ...updateWidgetDto },
        { new: true },
      )
      .populate('departmentIds')
      .exec();

    if (!updatedWidget) {
      throw new NotFoundException(
        `Widget with ID ${id} not found for update or you don't have permission to update it.`,
      );
    }
    return updatedWidget;
  }

  async remove(id: string): Promise<WidgetDocument> {
    const deletedWidget = await this.widgetModel.findByIdAndDelete(id).exec();
    if (!deletedWidget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
    }
    return deletedWidget;
  }

  async removeByAdmin(
    id: string,
    adminId: Types.ObjectId,
  ): Promise<WidgetDocument> {
    // First check if the widget exists and belongs to the admin
    await this.findByIdAndAdmin(id, adminId);

    const deletedWidget = await this.widgetModel
      .findOneAndDelete({ _id: id, createdBy: adminId })
      .exec();
    if (!deletedWidget) {
      throw new NotFoundException(
        `Widget with ID ${id} not found or you don't have permission to delete it`,
      );
    }
    return deletedWidget;
  }

  /**
   * Find widgets by department ID and domain
   * @param departmentId The department ID to search for
   * @param domain The domain to search for (will match exact domain or wildcard *)
   * @returns Array of widgets that match the criteria
   */
  async findByDepartmentAndDomain(
    departmentId: Types.ObjectId,
    domain: string,
  ): Promise<WidgetDocument[]> {
    return this.widgetModel
      .find({
        departmentIds: departmentId,
        $or: [
          { domains: domain },
          { domains: '*' }, // Match wildcard domain
        ],
        isEnabled: true, // Only return enabled widgets
      })
      .populate('departmentIds')
      .exec();
  }

  /**
   * Find widgets by department IDs
   * @param departmentIds Array of department IDs to search for
   * @returns Array of widgets that have at least one matching department
   */
  async findWidgetsByDepartments(
    departmentIds: string[],
  ): Promise<WidgetDocument[]> {
    const objectIds = departmentIds.map((id) => new Types.ObjectId(id));

    return this.widgetModel
      .find({
        departmentIds: { $in: objectIds },
        isEnabled: true, // Only return enabled widgets
      })
      .populate('departmentIds')
      .exec();
  }
}
