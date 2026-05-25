import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min } from 'class-validator';

export class UpdatePrescriptionDispenseDto {
  @ApiProperty({
    type: [Number],
    example: [11, 12],
    description:
      'Identifiers of the medications that were dispensed from this prescription.',
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  drug_ids!: number[];
}
