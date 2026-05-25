import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  Length,
  IsNotEmpty,
  Matches,
  IsEmail,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({
    example: 'Khaled Muhammad',
    description: "Patient's full name",
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name required' })
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

  @ApiProperty({ example: 'Male', enum: ['Male', 'Female'] })
  @IsString()
  @IsNotEmpty()
  gender!: string;

  @ApiProperty({
    example: '1995-05-15',
    description: 'Date of birth (ISO format)',
  })
  @IsDateString()
  birth_date!: string;

  @ApiProperty({
    example: '0599000222',
    description: 'Phone number (10 characters)',
  })
  @IsString()
  @Length(10, 10, { message: 'The phone number must be exactly 10 characters' })
  @Matches(/^[0-9]+$/, {
    message: 'The phone number must contain only numbers',
  })
  phone!: string;

  @ApiProperty({
    example: 'patient@email.com',
    description: 'Email (optional)',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email is invalid' })
  email?: string;

  @ApiProperty({
    example: '0599000333',
    description: 'Emergency contact (10 characters)',
  })
  @IsString()
  @Length(10, 10, {
    message: 'The emergency contact number must be exactly 10 characters',
  })
  @Matches(/^[0-9]+$/, {
    message: 'The emergency contact number should only contain numbers',
  })
  emergency_contact!: string;

  @ApiProperty({ example: 'A+', required: false })
  @IsOptional()
  @IsString()
  blood_type?: string;

  @ApiProperty({ example: 'Diabetes', required: false })
  @IsOptional()
  @IsString()
  chronic_diseases?: string;

  @ApiProperty({ example: 'Allergy notes', required: false })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiProperty({ example: 'Medical history notes', required: false })
  @IsOptional()
  @IsString()
  medical_history_notes?: string;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  smoking_status?: boolean;

  @ApiProperty({ example: 'General notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
