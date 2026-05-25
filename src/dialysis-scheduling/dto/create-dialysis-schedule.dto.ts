import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Weekday } from '@prisma/client';

class WeeklyScheduleSlotDto {
  @ApiProperty({ enum: Weekday, example: Weekday.MONDAY })
  @IsEnum(Weekday)
  weekday!: Weekday;

  @ApiProperty({ example: 1, minimum: 1, maximum: 8 })
  @IsInt()
  @Min(1)
  @Max(8)
  shiftNumber!: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  machineNumber!: number;
}

export class CreateDialysisScheduleDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  patientId!: number;

  @ApiProperty({
    type: [WeeklyScheduleSlotDto],
    example: [],
    description:
      'Send an empty array to clear the patient weekly dialysis schedule.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleSlotDto)
  slots!: WeeklyScheduleSlotDto[];
}
