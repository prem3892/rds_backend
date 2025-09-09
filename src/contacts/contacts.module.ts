import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact, ContactSchema } from '../schemas/contact.schema';
import { Customer, CustomerSchema } from '../schemas/customer.schema';
import {
  AgentProfile,
  AgentProfileSchema,
} from '../schemas/agent-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contact.name, schema: ContactSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
    ]),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
