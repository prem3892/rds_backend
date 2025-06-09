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
    return `https://localhost:5000/widgets/${widgetId.toString()}/script.js`;
  }

  async create(
    createWidgetDto: CreateWidgetDto,
    adminId: Types.ObjectId,
  ): Promise<WidgetDocument> {
    if (
      createWidgetDto.departmentIds &&
      createWidgetDto.departmentIds.length > 0
    ) {
      const departments = await this.departmentsService.findByIds(
        createWidgetDto.departmentIds,
      );
      if (departments.length !== createWidgetDto.departmentIds.length) {
        throw new BadRequestException(
          'One or more department IDs are invalid.',
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

  async findByIdPublic(
    id: string | Types.ObjectId,
  ): Promise<Partial<WidgetDocument> | null> {
    const widget = await this.widgetModel
      .findById(id)
      .select(
        'name domains departmentIds isEnabled primaryColor welcomeMessage headerText injectableScriptUrl',
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

  async remove(id: string): Promise<WidgetDocument> {
    const deletedWidget = await this.widgetModel.findByIdAndDelete(id).exec();
    if (!deletedWidget) {
      throw new NotFoundException(`Widget with ID ${id} not found`);
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
}
