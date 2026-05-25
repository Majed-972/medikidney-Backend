import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Length,
  Matches,
} from 'class-validator';

export class CreateDoctorDto {
  @ApiProperty({
    example: 'Dr. Ahmad Mustafa',
    description: 'Full name of the doctor',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  full_name!: string;

  @ApiProperty({
    example: '123456789',
    description: 'National ID number (exactly 9 characters)',
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
    example: 'Nephrology',
    description: 'Medical specialty',
  })
  @IsString()
  @IsNotEmpty()
  specialty!: string;

  @ApiProperty({
    example: '0599123456',
    description: 'Contact phone number (max. 10 characters)',
  })
  @IsString()
  @MaxLength(10)
  @Matches(/^[0-9]+$/, {
    message: 'The phone number must contain only numbers',
  })
  phone!: string;

  @ApiProperty({
    example: 'ahmad.dr@hospital.com',
    description:
      "Doctor's email (optional, must be in valid format if provided)",
    required: false,
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: false,
    default: false,
    description:
      'Is this doctor the head of the medical staff? (Optional, default is false)',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isHead?: boolean = false;
}
