import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ChatSessionSchema } from 'src/schemas/chat-session.schema';
import { AppointmentSchema } from 'src/schemas/appointment.schema';
import { CustomerSchema } from 'src/schemas/customer.schema';
import { UserSchema } from 'src/schemas/user.schema';
import { AttributionService } from 'src/shared/services/attribution.service';
import { AgentsModule } from 'src/agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ChatSession', schema: ChatSessionSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'Customer', schema: CustomerSchema },
      { name: 'User', schema: UserSchema },
    ]),
    forwardRef(() => AgentsModule),
  ],
  providers: [AnalyticsService, AttributionService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, AttributionService],
})
export class AnalyticsModule {}
