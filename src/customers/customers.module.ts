import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from 'src/schemas/customer.schema';
import { Widget, WidgetSchema } from 'src/schemas/widget.schema';
import {
  AgentProfile,
  AgentProfileSchema,
} from 'src/schemas/agent-profile.schema';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Widget.name, schema: WidgetSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
    ]),
    forwardRef(() => AgentsModule),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}
