import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Weekday } from '@prisma/client';

export class CreateDoctorScheduleDto {
  @ApiProperty({
    description: 'Day of the week',
    enum: Weekday,
    example: 'SUNDAY',
  })
  @IsEnum(Weekday)
  @IsNotEmpty()
  weekday!: Weekday;

  @ApiProperty({
    description: 'Start time (HH:mm:ss)',
    example: '09:00:00',
  })
  @IsString()
  @IsNotEmpty()
  start_time!: string;

  @ApiProperty({
    description: 'End time (HH:mm:ss)',
    example: '17:00:00',
  })
  @IsString()
  @IsNotEmpty()
  end_time!: string;
}
