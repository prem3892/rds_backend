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
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { UsersModule } from '../users/users.module'; // For updating user part like password
import { DepartmentsModule } from 'src/departments/departments.module';
import { ChatModule } from 'src/chat/chat.module'; // For active chat counts
import { WidgetsModule } from 'src/widgets/widgets.module'; // For widget details
import { ShiftService } from '../shared/services/shift.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentProfile.name, schema: AgentProfileSchema },
      { name: CannedMessage.name, schema: CannedMessageSchema },
    ]),
    forwardRef(() => UsersModule), // To update user details like password
    DepartmentsModule, // To validate departmentIds
    forwardRef(() => ChatModule), // To get active chat counts
    WidgetsModule, // For widget access
  ],
  controllers: [AgentsController],
  providers: [AgentsService, ShiftService],
  exports: [AgentsService, MongooseModule],
})
export class AgentsModule {}
