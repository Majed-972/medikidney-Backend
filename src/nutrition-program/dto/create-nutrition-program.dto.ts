import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateNutritionProgramDto {
  @ApiProperty({ example: 12, description: 'Patient ID' })
  @IsInt()
  patientId!: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'The ID of the nutritionist in the system (optional if the applicant is a NUTRITIONIST, and mandatory if he is a DOCTOR)',
  })
  @IsOptional()
  @IsInt()
  nutritionistId?: number;

  @ApiProperty({
    example: 'Plan Week 1',
    description: 'Nutrition program title',
  })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional({
    example: 'Nutrition program to reduce potassium',
    description: 'Program description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Banana, orange',
    description: 'Prohibited items',
  })
  @IsOptional()
  @IsString()
  forbiddenItems?: string;

  @ApiPropertyOptional({ example: 'Apple, berry', description: 'Permissibles' })
  @IsOptional()
  @IsString()
  allowedItems?: string;

  @ApiPropertyOptional({ example: 'Light oats', description: 'Breakfast' })
  @IsOptional()
  @IsString()
  breakfast?: string;

  @ApiPropertyOptional({ example: 'Boiled rice', description: 'the lunch' })
  @IsOptional()
  @IsString()
  lunch?: string;

  @ApiPropertyOptional({ example: 'Cooked vegetables', description: 'dinner' })
  @IsOptional()
  @IsString()
  dinner?: string;

  @ApiPropertyOptional({
    example: 'With a little salt note',
    description: 'Meal/day notes',
  })
  @IsOptional()
  @IsString()
  mealNotes?: string;

  @ApiProperty({
    example: '2026-03-24T00:00:00.000Z',
    description: 'The date (start_date) for this program',
  })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({
    example: '2026-03-30T00:00:00.000Z',
    description: 'Program end date (optional)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
