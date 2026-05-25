import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDialysisSettingsDto {
  @ApiPropertyOptional({
    description: 'Blood flow rate in ml/min',
    example: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  bloodFlowRate?: number;

  @ApiPropertyOptional({
    description: 'Dialysate flow rate in ml/min',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  dialysateFlow?: number;

  @ApiPropertyOptional({
    description: 'Ultrafiltration rate in ml/hour',
    example: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ultrafiltrationRate?: number;
}
