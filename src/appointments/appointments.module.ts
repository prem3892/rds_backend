import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from 'src/schemas/appointment.schema';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { UsersModule } from 'src/users/users.module';
import { CustomersModule } from 'src/customers/customers.module';
import { ChatModule } from 'src/chat/chat.module';
import { AgentsModule } from 'src/agents/agents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    forwardRef(() => UsersModule),
    CustomersModule,
    forwardRef(() => ChatModule), // Using forwardRef to avoid circular dependency
    forwardRef(() => AgentsModule), // Using forwardRef to avoid circular dependency
  ],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
  exports: [AppointmentsService, MongooseModule],
})
export class AppointmentsModule {}
