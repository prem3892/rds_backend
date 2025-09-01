import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MailerController],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
