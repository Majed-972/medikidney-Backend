import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMedicationDto {
  @ApiProperty({
    description: 'The name of the medication such as Heparin, EPO, or Saline',
    example: 'HEPARIN',
  })
  @IsNotEmpty()
  @IsString()
  medicationName!: string;

  @ApiProperty({
    description: 'Dosage',
    example: 5000,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.1)
  dosage!: number;

  @ApiProperty({
    description: 'Unit of measurement such as IU, mg, or ml',
    example: 'IU',
  })
  @IsNotEmpty()
  @IsString()
  unit!: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the medication',
    example: 'The medication was administered successfully.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
