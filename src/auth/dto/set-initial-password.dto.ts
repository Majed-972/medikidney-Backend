import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetInitialPasswordDto {
  @ApiProperty({
    example: 'newPassword458',
    description: 'The new password that the user will adopt upon first login.',
  })
  @IsString()
  @MinLength(8, {
    message: 'The new password must be at least 8 characters long.',
  })
  @MaxLength(100)
  newPassword!: string;

  @ApiProperty({
    example: 'newPassword458',
    description: 'Confirm the new password.',
  })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
