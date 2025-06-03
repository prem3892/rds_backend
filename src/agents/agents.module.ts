import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AgentProfile,
  AgentProfileSchema,
} from 'src/schemas/agent-profile.schema';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { UsersModule } from '../users/users.module'; // For updating user part like password
import { DepartmentsModule } from 'src/departments/departments.module';
import { ChatModule } from 'src/chat/chat.module'; // For active chat counts

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentProfile.name, schema: AgentProfileSchema },
    ]),
    forwardRef(() => UsersModule), // To update user details like password
    DepartmentsModule, // To validate departmentIds
    forwardRef(() => ChatModule), // To get active chat counts
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService, MongooseModule],
})
export class AgentsModule {}
