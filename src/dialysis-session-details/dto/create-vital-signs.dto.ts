import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateVitalSignsDto {
  @ApiPropertyOptional({
    description: 'Systolic blood pressure (SYS) - from 40 to 250 mmHg',
    example: 140,
  })
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(250)
  systolic?: number;

  @ApiPropertyOptional({
    description: 'Diastolic blood pressure (DIA) - from 20 to 180 mmHg',
    example: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(180)
  diastolic?: number;

  @ApiPropertyOptional({
    description: 'Pulse (beats per minute) - from 30 to 250',
    example: 72,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  pulse?: number;

  @ApiPropertyOptional({
    description: 'Temperature (°C) - from 34 to 43',
    example: 36.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(34)
  @Max(43)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Oxygen saturation (%) - from 50 to 100',
    example: 98,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  oxygenSaturation?: number;
}
