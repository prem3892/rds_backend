import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Widget, WidgetSchema } from 'src/schemas/widget.schema';
import { WidgetsService } from './widgets.service';
import { WidgetsController } from './widgets.controller';
import { DepartmentsModule } from 'src/departments/departments.module'; // To validate departmentIds
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Widget.name, schema: WidgetSchema }]),
    DepartmentsModule,
    ConfigModule,
  ],
  controllers: [WidgetsController],
  providers: [WidgetsService],
  exports: [WidgetsService, MongooseModule],
})
export class WidgetsModule {}
