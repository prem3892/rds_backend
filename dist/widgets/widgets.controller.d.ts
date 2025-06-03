import { Response } from 'express';
import { WidgetsService } from './widgets.service';
import { UpdateWidgetDto } from './dto/update-widget.dto';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { CreateWidgetDto } from 'src/departments/dto/create-widget.dto';
export declare class WidgetsController {
    private readonly widgetsService;
    constructor(widgetsService: WidgetsService);
    create(createWidgetDto: CreateWidgetDto, user: JwtPayload): Promise<import("../schemas/widget.schema").WidgetDocument>;
    findAll(): Promise<import("../schemas/widget.schema").WidgetDocument[]>;
    findOneForAdmin(widgetId: string): Promise<import("../schemas/widget.schema").WidgetDocument>;
    getWidgetScript(widgetId: string, res: Response): Promise<void>;
    getWidgetPublicConfig(widgetId: string, res: Response): Promise<Response<any, Record<string, any>>>;
    findOne(id: string): Promise<import("../schemas/widget.schema").WidgetDocument>;
    update(id: string, updateWidgetDto: UpdateWidgetDto): Promise<import("../schemas/widget.schema").WidgetDocument>;
    remove(id: string): Promise<import("../schemas/widget.schema").WidgetDocument>;
}
