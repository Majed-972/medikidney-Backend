import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateNutritionProgramDto {
  @ApiPropertyOptional({ example: 12, description: 'Patient ID (optional)' })
  @IsOptional()
  @IsInt()
  patientId?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Nutritionist ID (optional if the applicant is NUTRITIONIST, and mandatory if DOCTOR when changing nutritionist_id)',
  })
  @IsOptional()
  @IsInt()
  nutritionistId?: number;

  @ApiPropertyOptional({
    example: 'Plan Week 2',
    description: 'Program title (optional)',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated description',
    description: 'Program description (optional)',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'forbidden',
    description: 'Prohibited items (optional)',
  })
  @IsOptional()
  @IsString()
  forbiddenItems?: string;

  @ApiPropertyOptional({
    example: 'Allowed',
    description: 'Permissions (optional)',
  })
  @IsOptional()
  @IsString()
  allowedItems?: string;

  @ApiPropertyOptional({
    example: 'New breakfast',
    description: 'Breakfast (optional)',
  })
  @IsOptional()
  @IsString()
  breakfast?: string;

  @ApiPropertyOptional({
    example: 'New lunch',
    description: 'Lunch (optional)',
  })
  @IsOptional()
  @IsString()
  lunch?: string;

  @ApiPropertyOptional({
    example: 'New dinner',
    description: 'Dinner (optional)',
  })
  @IsOptional()
  @IsString()
  dinner?: string;

  @ApiPropertyOptional({
    example: 'note',
    description: 'Meal/day notes (optional)',
  })
  @IsOptional()
  @IsString()
  mealNotes?: string;

  @ApiPropertyOptional({
    example: '2026-03-24T00:00:00.000Z',
    description: 'Date (start_date) (optional)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-03-30T00:00:00.000Z',
    description: 'Program end date (optional)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
