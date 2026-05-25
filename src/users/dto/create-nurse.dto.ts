import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  Length,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreateNurseDto {
  @ApiProperty({
    example: 'Sara Ahmad',
    description: "The nurse's full name",
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name required' })
  @Length(1, 200)
  full_name!: string;

  @ApiProperty({
    example: '123456789',
    description: 'National ID number (9 letters)',
  })
  @IsString()
  @Length(9, 9, {
    message: 'The national ID number must be exactly 9 characters',
  })
  @Matches(/^[0-9]+$/, {
    message: 'The national ID number must contain only numbers',
  })
  national_id!: string;

  @ApiProperty({
    example: '0599000111',
    description: 'Contact phone number (max. 10 characters)',
  })
  @IsString()
  @Length(10, 10, { message: 'The phone number must be exactly 10 characters' })
  @Matches(/^[0-9]+$/, {
    message: 'The phone number must contain only numbers',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: 'nurse@example.com',
    description: "Nurse's email",
  })
  @IsEmail()
  email!: string;
}
