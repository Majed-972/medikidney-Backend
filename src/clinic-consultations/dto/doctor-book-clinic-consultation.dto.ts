import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class DoctorBookClinicConsultationDto {
  @ApiProperty({
    description:
      'The review appointment date is in YYYY-MM-DD or ISO date format.',
    example: '2026-04-15',
  })
  @IsDateString()
  @IsNotEmpty()
  apptDate!: string;

  @ApiProperty({
    description:
      'Review appointment time. Accepts HH:mm, HH:mm:ss, or ISO datetime.',
    example: '10:30:00',
  })
  @IsString()
  @IsNotEmpty()
  apptTime!: string;

  @ApiPropertyOptional({
    description: 'The reason for the review is determined by the doctor.',
    example: 'Review after a week to monitor treatment response.',
  })
  @IsOptional()
  @IsString()
  visitReason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes related to booking an appointment.',
    example: 'Please bring the results of the latest tests when reviewing.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
