import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AgentsModule } from '../agents/agents.module';
import { CustomersModule } from '../customers/customers.module';
import { WidgetsModule } from '../widgets/widgets.module';
import { DepartmentsModule } from 'src/departments/departments.module';
import { ConfigModule } from '@nestjs/config';
import { AppointmentsModule } from 'src/appointments/appointments.module'; // For appointment booked notice
import { MailerModule } from '../shared/mailer/mailer.module';
import {
  ChatSession,
  ChatSessionSchema,
} from 'src/schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageSchema,
} from 'src/schemas/chat-message.schema';
import { ChatGateway } from './chat.gateway';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { ChatNotificationService } from './services/chat-notification/chat-notification.service';
import { ChatTranscriptService } from './services/chat-transcript/chat-transcript.service';
import { VisitorStateService } from './services/visitor-state/visitor-state.service';
import { VisitorTrackingController } from './visitor-tracking.controller';
import { PublicChatController } from './public-chat.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    ConfigModule,
    forwardRef(() => AuthModule), // For JWT validation in gateway
    forwardRef(() => UsersModule), // UsersModule might need services from ChatModule indirectly
    forwardRef(() => AgentsModule), // AgentsModule might need ChatSessionService
    CustomersModule,
    WidgetsModule,
    DepartmentsModule,
    forwardRef(() => AppointmentsModule), // For sending appointment booked notices
    MailerModule,
    // AppRedisModule is Global, so no need to import here explicitly
  ],
  providers: [
    ChatGateway,
    ChatSessionService,
    ChatMessageService,
    ChatNotificationService,
    ChatTranscriptService,
    VisitorStateService,
  ],
  controllers: [
    ChatController,
    VisitorTrackingController,
    PublicChatController,
  ],
  exports: [
    ChatSessionService,
    ChatMessageService,
    ChatNotificationService,
    ChatTranscriptService,
    VisitorStateService,
    ChatGateway, // If other modules need to emit via gateway
    MongooseModule,
  ],
})
export class ChatModule {}
