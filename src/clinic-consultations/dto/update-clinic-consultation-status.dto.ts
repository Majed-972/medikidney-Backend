import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateClinicConsultationStatusDto {
  @ApiProperty({
    description: 'Update the appointment status to Complete or Overdue.',
    enum: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW],
    example: AppointmentStatus.COMPLETED,
  })
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;

  @ApiPropertyOptional({
    description: "Doctor's notes on the clinical visit.",
    example: 'The patient is stable and needs follow-up after a week.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Clinical diagnosis of the visit.',
    example: 'High blood pressure with mild edema.',
  })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({
    description: 'Proposed treatment plan.',
    example: 'Adjust doses and review after 7 days.',
  })
  @IsOptional()
  @IsString()
  treatment_plan?: string;

  @ApiPropertyOptional({
    description: 'Medications or drug recommendations for the visit.',
    example: 'Amlodipine 5mg daily.',
  })
  @IsOptional()
  @IsString()
  medications?: string;
}
