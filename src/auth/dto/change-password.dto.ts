import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: "The user's current password",
  })
  @IsString()
  @MinLength(8, {
    message: 'Your current password must be at least 8 characters long',
  })
  oldPassword!: string;

  @ApiProperty({
    example: 'newPassword458',
    description:
      'New password (minimum 8 characters, must be different from old password)',
  })
  @IsString()
  @MinLength(8, { message: 'The new password must be at least 8 characters' })
  @MaxLength(100)
  newPassword!: string;

  @ApiProperty({
    example: 'newPassword458',
    description: 'Confirm the new password',
  })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
