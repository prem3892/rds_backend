import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact, ContactSchema } from '../schemas/contact.schema';
import { Customer, CustomerSchema } from '../schemas/customer.schema';
import {
  AgentProfile,
  AgentProfileSchema,
} from '../schemas/agent-profile.schema';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contact.name, schema: ContactSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
    ]),
    forwardRef(() => AgentsModule),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
