import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class GetClinicConsultationAvailabilityDto {
  @ApiProperty({
    description:
      'Identification number of the doctor whose available times are requested to be displayed.',
    example: 17,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doctorId!: number;

  @ApiPropertyOptional({
    description:
      'Patient ID when requested by the physician for available times for that specific patient.',
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patientId?: number;

  @ApiProperty({
    description: 'Requested appointment date in YYYY-MM-DD format.',
    example: '2026-04-10',
  })
  @IsDateString()
  date!: string;
}
