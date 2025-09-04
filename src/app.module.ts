import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { WidgetsModule } from './widgets/widgets.module';
import { AgentsModule } from './agents/agents.module';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { ChatModule } from './chat/chat.module';
import { AppRedisModule } from './shared/redis/redis.module';
import { MailerModule } from './shared/mailer/mailer.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: (() => {
        const NODE_ENV = process.env.NODE_ENV;
        return NODE_ENV ? `.env.${NODE_ENV}` : '.env.local'; // Default to .env.local if no NODE_ENV specified
      })(),
      load: [configuration],
      isGlobal: true, // Ensure ConfigService is globally available before AppRedisModule needs it
    }),
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    AppRedisModule, // Import global AppRedisModule early, after its dependency ConfigModule
    MailerModule, // Import global MailerModule early, after its dependency ConfigModule
    AuthModule,
    UsersModule,
    DepartmentsModule,
    WidgetsModule,
    AgentsModule,
    CustomersModule,
    ContactsModule,
    ChatModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
