import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Department, DepartmentSchema } from 'src/schemas/department.schema';
import {
  AgentProfile,
  AgentProfileSchema,
} from 'src/schemas/agent-profile.schema';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { AgentsModule } from 'src/agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
    ]),
    forwardRef(() => AgentsModule),
  ],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService, MongooseModule],
})
export class DepartmentsModule {}
