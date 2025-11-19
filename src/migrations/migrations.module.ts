import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChatSession,
  ChatSessionSchema,
} from 'src/schemas/chat-session.schema';
import { Customer, CustomerSchema } from 'src/schemas/customer.schema';
import { BackfillChatSessionSourceMigration } from './backfill-chat-session-source.migration';
import { AnalyticsModule } from 'src/analytics/analytics.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    AnalyticsModule,
  ],
  providers: [BackfillChatSessionSourceMigration],
  exports: [BackfillChatSessionSourceMigration],
})
export class MigrationsModule {}
