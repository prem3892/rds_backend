import { IsNumberString, IsOptional } from 'class-validator';

export class GetMessagesQueryDto {
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsNumberString()
  page?: number; // or use cursor-based with lastMessageId
}
