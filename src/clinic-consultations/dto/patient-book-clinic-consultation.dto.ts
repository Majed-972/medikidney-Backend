import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PatientBookClinicConsultationDto {
  @ApiProperty({
    description:
      'The number of the doctor you want to book an appointment with',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  doctorId!: number;

  @ApiProperty({
    description: 'Revision date in YYYY-MM-DD or ISO date format',
    example: '2026-04-01',
  })
  @IsDateString()
  @IsNotEmpty()
  apptDate!: string;

  @ApiProperty({
    description: 'Review time. Accepts HH:mm, HH:mm:ss, or ISO datetime',
    example: '09:00:00',
  })
  @IsString()
  @IsNotEmpty()
  apptTime!: string;

  @ApiPropertyOptional({
    description: 'Reason for visit',
    example: 'Routine medical case follow-up',
  })
  @IsOptional()
  @IsString()
  visitReason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes from the patient',
    example: 'The best timing is in the morning',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
