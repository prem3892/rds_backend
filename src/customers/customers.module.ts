import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from 'src/schemas/customer.schema';
import { Widget, WidgetSchema } from 'src/schemas/widget.schema';
import {
  AgentProfile,
  AgentProfileSchema,
} from 'src/schemas/agent-profile.schema';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Widget.name, schema: WidgetSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService, MongooseModule],
})
export class CustomersModule {}
