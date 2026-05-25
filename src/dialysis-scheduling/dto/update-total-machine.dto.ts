import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateTotalMachinesDto {
  @ApiPropertyOptional({
    example: 8,
    description: 'Updated total number of dialysis machines in the department.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalMachines?: number;

  @ApiPropertyOptional({
    example: 6,
    minimum: 4,
    maximum: 7,
    description: 'Updated number of active dialysis shifts in the system.',
  })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(7)
  activeShifts?: number;
}
