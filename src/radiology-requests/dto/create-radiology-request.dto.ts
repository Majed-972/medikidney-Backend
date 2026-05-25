import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRadiologyRequestDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  patient_id!: number;

  @ApiPropertyOptional({
    example: 5,
    description:
      'optional. It can be left blank so the system will automatically assign the request when a radiologist is available.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  radiologist_id?: number;

  @ApiProperty({ example: 'CT Scan' })
  @IsString()
  image_type!: string;

  @ApiPropertyOptional({ example: 'Abdominal imaging with dye when needed' })
  @IsOptional()
  @IsString()
  description?: string;
}
