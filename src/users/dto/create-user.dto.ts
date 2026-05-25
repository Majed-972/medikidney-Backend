import { Role } from '@prisma/client';
import { CreateDoctorDto } from './create-doctor.dto';
import { CreatePatientDto } from './create-patient.dto';
import { CreateNurseDto } from './create-nurse.dto';
import { CreateSpecialistDto } from './create-specialist.dto';
import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@ApiExtraModels(
  CreateDoctorDto,
  CreatePatientDto,
  CreateNurseDto,
  CreateSpecialistDto,
)
export class CreateUserDto {
  @ApiProperty({ enum: Role, example: Role.DOCTOR })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'User details by role (doctor, patient, nurse, specialist)',
    oneOf: [
      { $ref: getSchemaPath(CreateDoctorDto) },
      { $ref: getSchemaPath(CreatePatientDto) },
      { $ref: getSchemaPath(CreateNurseDto) },
      { $ref: getSchemaPath(CreateSpecialistDto) },
    ],
  })
  @IsOptional()
  @ValidateNested()
  @Type((opts) => {
    const role = (opts?.object as CreateUserDto)?.role;
    switch (role) {
      case Role.DOCTOR:
        return CreateDoctorDto;
      case Role.PATIENT:
        return CreatePatientDto;
      case Role.NURSE:
        return CreateNurseDto;
      case Role.PHARMACIST:
      case Role.LAB_TECH:
      case Role.RADIOLOGIST:
      case Role.NUTRITIONIST:
        return CreateSpecialistDto;
      default:
        return Object;
    }
  })
  details?:
    | CreateDoctorDto
    | CreatePatientDto
    | CreateNurseDto
    | CreateSpecialistDto;
}
