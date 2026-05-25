import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'doctor@hospital.com',
    description:
      'Email of a user who has forgotten his password and wants to regain access to his account',
    required: true,
  })
  @IsEmail()
  email!: string;
}
