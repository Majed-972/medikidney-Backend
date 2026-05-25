import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMedicalTestDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  patient_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  lab_specialist_id?: number;

  @ApiProperty()
  @IsString()
  test_type!: string;

  @ApiPropertyOptional({
    example: 'Please upload a PDF report with detailed CBC values.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
