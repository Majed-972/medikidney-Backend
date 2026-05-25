import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'doctor@hospital.com',
    description: 'Email address (Required for OTP verification)',
  })
  @IsNotEmpty({ message: 'Email is required to verify the code' })
  @IsEmail({}, { message: 'The email format is incorrect' })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit verification code (Required for OTP verification)',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'The code must consist of only 6 numbers' })
  otp!: string;
}
