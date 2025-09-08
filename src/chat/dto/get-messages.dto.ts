import { IsNumberString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetMessagesQueryDto {
  @ApiProperty({
    description: 'Number of messages to retrieve per page',
    example: 50,
    required: false,
    default: 50,
  })
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumberString()
  page?: number;
}
