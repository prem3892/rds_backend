import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ChatModule } from '../chat/chat.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AgentsModule } from '../agents/agents.module';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';
import { DepartmentsModule } from '../departments/departments.module';
import { WidgetsModule } from '../widgets/widgets.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    ChatModule,
    AgentsModule,
    UsersModule,
    CustomersModule,
    DepartmentsModule,
    WidgetsModule,
  ],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
