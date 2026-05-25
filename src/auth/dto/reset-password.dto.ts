import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'doctor@hospital.com',
    description:
      'The email of the user who has forgotten his password and wants to regain access to his account',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '0599123458',
    description: 'phone number',
    required: false,
  })
  @ApiProperty({
    example: 'newPassword123',
    description: 'New password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'The new password must be at least 8 characters' })
  newPassword!: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'Confirm the new password',
  })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
