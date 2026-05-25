import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';

export class CreateSpecialistDto {
  @ApiProperty({
    example: 'Ahmed Sami',
    description: 'Full name of the specialist',
  })
  @IsString()
  @Length(3, 200, { message: 'Full name must be between 3 and 200 characters' })
  full_name!: string;

  @ApiProperty({
    example: '123456789',
    description: 'National ID number (9 letters)',
  })
  @IsString()
  @Length(9, 9, {
    message: 'The national ID number must be exactly 9 characters',
  })
  // If you want to make sure it's just numbers even though it's a String
  @Matches(/^[0-9]+$/, {
    message: 'The national ID number must contain only numbers',
  })
  national_id!: string;

  @ApiProperty({
    example: '0599111222',
    description: 'Contact phone number (exactly 10 characters)',
  })
  @IsString()
  @Length(10, 10, { message: 'The phone number must be exactly 10 characters' })
  @Matches(/^[0-9]+$/, {
    message: 'The phone number must contain only numbers',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: 'specialist@hospital.com',
    description: 'Email of the specialist',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: 'Nephrology',
    description: 'Medical specialty (required for doctor)',
  })
  @IsOptional()
  @IsString()
  specialty?: string;
}
