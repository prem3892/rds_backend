import { PartialType } from '@nestjs/mapped-types';
import { CreateCannedMessageDto } from './create-canned-message.dto';

export class UpdateCannedMessageDto extends PartialType(
  CreateCannedMessageDto,
) {}
