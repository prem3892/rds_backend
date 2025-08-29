import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateAutoMessageDto } from './create-auto-message.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAutoMessageDto extends PartialType(CreateAutoMessageDto) {
  @ApiProperty({
    description: 'Whether the auto message is enabled',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
