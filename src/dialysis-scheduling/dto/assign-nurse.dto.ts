import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AssignNurseDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  scheduleId!: number;
}
