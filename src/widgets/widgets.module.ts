import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Widget, WidgetSchema } from 'src/schemas/widget.schema';
import {
  AutoMessage,
  AutoMessageSchema,
} from 'src/schemas/auto-message.schema';
import { WidgetsService } from './widgets.service';
import { AutoMessagesService } from './auto-messages.service';
import { WidgetsController } from './widgets.controller';
import { AutoMessagesController } from './auto-messages.controller';
import { DepartmentsModule } from 'src/departments/departments.module'; // To validate departmentIds
import { ConfigModule } from '@nestjs/config';
import { AgentsModule } from 'src/agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Widget.name, schema: WidgetSchema },
      { name: AutoMessage.name, schema: AutoMessageSchema },
    ]),
    forwardRef(() => DepartmentsModule),
    ConfigModule,
    forwardRef(() => AgentsModule),
  ],
  controllers: [WidgetsController, AutoMessagesController],
  providers: [WidgetsService, AutoMessagesService],
  exports: [WidgetsService, AutoMessagesService, MongooseModule],
})
export class WidgetsModule {}
