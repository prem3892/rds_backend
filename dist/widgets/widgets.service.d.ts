import { Model, Types } from 'mongoose';
import { WidgetDocument } from 'src/schemas/widget.schema';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { DepartmentsService } from 'src/departments/departments.service';
import { ConfigService } from '@nestjs/config';
import { CreateWidgetDto } from 'src/departments/dto/create-widget.dto';
export declare class WidgetsService {
    private widgetModel;
    private readonly departmentsService;
    private readonly configService;
    private readonly appDomain;
    constructor(widgetModel: Model<WidgetDocument>, departmentsService: DepartmentsService, configService: ConfigService);
    private generateInjectableScriptUrl;
    create(createWidgetDto: CreateWidgetDto, adminId: Types.ObjectId): Promise<WidgetDocument>;
    findAll(): Promise<WidgetDocument[]>;
    findById(id: string | Types.ObjectId): Promise<WidgetDocument>;
    findByIdPublic(id: string | Types.ObjectId): Promise<Partial<WidgetDocument> | null>;
    update(id: string, updateWidgetDto: UpdateWidgetDto): Promise<WidgetDocument>;
    remove(id: string): Promise<WidgetDocument>;
}
