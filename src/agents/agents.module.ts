import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AgentProfile,
  AgentProfileSchema,
} from 'src/schemas/agent-profile.schema';
import {
  CannedMessage,
  CannedMessageSchema,
} from 'src/schemas/canned-message.schema';
import {
  ChatSession,
  ChatSessionSchema,
} from 'src/schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageSchema,
} from 'src/schemas/chat-message.schema';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { UsersModule } from '../users/users.module'; // For updating user part like password
import { DepartmentsModule } from 'src/departments/departments.module';
import { ChatModule } from 'src/chat/chat.module'; // For active chat counts
import { WidgetsModule } from 'src/widgets/widgets.module'; // For widget details
import { CustomersModule } from 'src/customers/customers.module'; // For customer access validation
import { ShiftService } from '../shared/services/shift.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentProfile.name, schema: AgentProfileSchema },
      { name: CannedMessage.name, schema: CannedMessageSchema },
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    forwardRef(() => UsersModule), // To update user details like password
    DepartmentsModule, // To validate departmentIds
    forwardRef(() => ChatModule), // To get active chat counts
    WidgetsModule, // For widget access
    forwardRef(() => CustomersModule), // For customer access validation
  ],
  controllers: [AgentsController],
  providers: [AgentsService, ShiftService],
  exports: [AgentsService, MongooseModule],
})
export class AgentsModule {}
