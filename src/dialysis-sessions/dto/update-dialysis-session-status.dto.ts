import { ApiPropertyOptional } from '@nestjs/swagger';
import { DialysisSessionStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDialysisSessionStatusDto {
  @ApiPropertyOptional({
    enum: DialysisSessionStatus,
    example: DialysisSessionStatus.COMPLETED,
    description: 'The status of the dialysis session.',
  })
  @IsOptional()
  @IsEnum(DialysisSessionStatus)
  status?: DialysisSessionStatus;

  @ApiPropertyOptional({
    example: 72.8,
    description: 'The weight of the patient after the dialysis session.',
  })
  @IsOptional()
  @IsNumber()
  weightAfter?: number;

  @ApiPropertyOptional({
    example: '10:00:00.000',
    description: 'Time only value recorded when the nurse closes the session.',
  })
  @IsOptional()
  @IsString()
  endTime?: string;
}
