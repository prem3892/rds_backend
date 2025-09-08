import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ChatModule } from '../chat/chat.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, ChatModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
