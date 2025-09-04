import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateContactDto } from './create-contact.dto';

export class UpdateContactDto extends PartialType(
  OmitType(CreateContactDto, ['customer'] as const),
) {
  @ApiProperty({
    description: 'First name of the contact',
    example: 'John',
    required: false,
    minLength: 1,
    maxLength: 50,
  })
  firstName?: string;

  @ApiProperty({
    description: 'Last name of the contact',
    example: 'Doe',
    required: false,
    minLength: 1,
    maxLength: 50,
  })
  lastName?: string;

  @ApiProperty({
    description: 'Email address of the contact',
    example: 'john.doe@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Phone number of the contact',
    example: '+1234567890',
    required: false,
    maxLength: 20,
  })
  phone?: string;
}
