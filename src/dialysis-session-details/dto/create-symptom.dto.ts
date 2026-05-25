import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SeverityLevel, SymptomType } from '@prisma/client';

export class CreateSymptomDto {
  @ApiProperty({
    description: 'The type of symptom or event',
    enum: SymptomType,
    example: 'LOW_BP',
  })
  @IsNotEmpty()
  @IsEnum(SymptomType)
  symptomType!: SymptomType;

  @ApiPropertyOptional({
    description: 'The severity of the symptom',
    enum: SeverityLevel,
    example: 'MILD',
  })
  @IsOptional()
  @IsEnum(SeverityLevel)
  severity?: SeverityLevel;

  @ApiPropertyOptional({
    description: 'Additional notes about the viewer',
    example: 'The pressure decreased and then improved after the intervention.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
