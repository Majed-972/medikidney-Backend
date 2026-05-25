import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Phone number (10 characters)' })
  @IsOptional()
  @IsString()
  @Length(10, 10, { message: 'The phone number must be exactly 10 characters' })
  phone?: string;

  @ApiPropertyOptional({ description: 'e-mail' })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format.' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact number (10 characters)',
  })
  @IsOptional()
  @IsString()
  @Length(10, 10, {
    message: 'The emergency contact number must be exactly 10 characters',
  })
  emergency_contact?: string;

  @ApiPropertyOptional({ description: 'Patient sensitivity.' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ description: 'Chronic diseases of the patient.' })
  @IsOptional()
  @IsString()
  chronic_diseases?: string;

  @ApiPropertyOptional({ description: 'Patient medical history notes.' })
  @IsOptional()
  @IsString()
  medical_history_notes?: string;

  @ApiPropertyOptional({ description: "Patient's blood type." })
  @IsOptional()
  @IsString()
  blood_type?: string;

  @ApiPropertyOptional({ description: 'Smoking status.' })
  @IsOptional()
  @IsBoolean()
  smoking_status?: boolean;

  @ApiPropertyOptional({ description: 'Additional medical notes.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
