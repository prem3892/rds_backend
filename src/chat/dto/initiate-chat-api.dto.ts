import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateChatApiDto {
  @ApiProperty({
    description: 'The ID of the customer to initiate chat with',
    example: '64f123abc456def789012345',
  })
  @IsMongoId()
  @IsNotEmpty()
  customerId: string;
}
