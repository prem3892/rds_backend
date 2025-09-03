import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockCustomerDto {
  @ApiProperty({
    description:
      'MongoDB ObjectId of the customer to block. This customer will lose access to all chat functionality.',
    example: '507f1f77bcf86cd799439011',
    format: 'ObjectId',
  })
  @IsNotEmpty({ message: 'Customer ID is required' })
  @IsString({ message: 'Customer ID must be a string' })
  @IsMongoId({ message: 'Customer ID must be a valid MongoDB ObjectId' })
  customerId: string;
}

export class UnblockCustomerDto {
  @ApiProperty({
    description:
      'MongoDB ObjectId of the customer to unblock. This customer will regain access to all chat functionality.',
    example: '507f1f77bcf86cd799439011',
    format: 'ObjectId',
  })
  @IsNotEmpty({ message: 'Customer ID is required' })
  @IsString({ message: 'Customer ID must be a string' })
  @IsMongoId({ message: 'Customer ID must be a valid MongoDB ObjectId' })
  customerId: string;
}
