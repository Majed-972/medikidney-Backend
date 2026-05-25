import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MinLength } from 'class-validator';

export class ChangePatientPasswordDto {
  @ApiProperty({
    example: 5,
    description: 'Patient ID whose password will be changed',
  })
  @IsNumber()
  patientId!: number;

  @ApiProperty({
    example: 'NewSecurePassword123',
    description: 'New password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'The new password must be at least 8 characters' })
  newPassword!: string;
}
