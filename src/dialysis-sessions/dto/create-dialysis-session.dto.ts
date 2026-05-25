import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DialysisSessionStatus } from '@prisma/client';
import {
  IsEnum,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDialysisSessionDto {
  @ApiProperty({ example: 12, description: 'Patient ID' })
  @IsInt()
  @Min(1)
  patientId!: number;

  @ApiProperty({
    example: 5,
    description: 'Fixed weekly schedule identifier for the patient',
  })
  @IsInt()
  @Min(1)
  scheduleId!: number;

  @ApiProperty({
    example: '2026-03-30T00:00:00.000Z',
    description: 'The date of the day on which the session actually took place',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    example: '07:15:00.000',
    description: 'Actual session start time',
  })
  @IsString()
  startTime!: string;

  @ApiPropertyOptional({
    example: '10:00:00.000',
    description: 'Actual session end time',
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({
    example: 74.5,
    description: 'Weigh the patient before the session',
  })
  @IsNumber()
  weightBefore!: number;

  @ApiPropertyOptional({
    example: 72.8,
    description: "Patient's weight after the session",
  })
  @IsOptional()
  @IsNumber()
  weightAfter?: number;

  @ApiPropertyOptional({
    example: 1.7,
    description: 'The amount of fluid withdrawn',
  })
  @IsOptional()
  @IsNumber()
  fluidRemoved?: number;

  @ApiPropertyOptional({
    example: '130/80',
    description: 'Blood pressure before the session',
  })
  @IsOptional()
  @IsString()
  bloodPressureBefore?: string;

  @ApiPropertyOptional({
    example: '120/75',
    description: 'Blood pressure after the session',
  })
  @IsOptional()
  @IsString()
  bloodPressureAfter?: string;

  @ApiPropertyOptional({
    example: 'Good stability during the session',
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: DialysisSessionStatus,
    example: DialysisSessionStatus.PENDING,
    description: 'Actual washing session status',
  })
  @IsOptional()
  @IsEnum(DialysisSessionStatus)
  status?: DialysisSessionStatus;
}
