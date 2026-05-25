import { ApiPropertyOptional } from '@nestjs/swagger';
import { Weekday } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PatchDialysisScheduleDto {
  @ApiPropertyOptional({ enum: Weekday, example: Weekday.WEDNESDAY })
  @IsOptional()
  @IsEnum(Weekday)
  weekday?: Weekday;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  shiftNumber?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  machineNumber?: number;
}
