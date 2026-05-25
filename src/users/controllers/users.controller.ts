import {
  Controller,
  Get,
  UseGuards,
  Req,
  Body,
  Patch,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UpdateProfileDto } from '../dto/update-user.dto';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/profile')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get my personal data' })
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.findOne(req.user.userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update my personal data' })
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      req.user.userId,
      req.user.role,
      updateDto,
    );
  }
  @Get('patients/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.NURSE,
    Role.LAB_TECH,
    Role.PHARMACIST,
    Role.RADIOLOGIST,
    Role.NUTRITIONIST,
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Flexible search for patients by name (partial and case insensitive)',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description:
      "Part of the patient's name for the search (the search is partial and case insensitive, only showing patients with accounts enabled canAccess=true)",
  })
  async searchPatients(@Query('name') name: string) {
    return this.usersService.searchPatientsByName(name);
  }

  @Get('patients/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.NURSE,
    Role.LAB_TECH,
    Role.PHARMACIST,
    Role.RADIOLOGIST,
    Role.NUTRITIONIST,
    Role.PATIENT,
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bring the complete file for a specific patient)',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID of the patient',
    type: Number,
  })
  async getPatientProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getPatientProfileByUserId(id);
  }

  @Patch('patients/:id/medical')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Updating the medical data of a specific patient by the doctor without compromising personal data',
  })
  @ApiParam({
    name: 'id',
    description: 'Patient user ID',
    type: Number,
  })
  async updatePatientMedicalProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updatePatientMedicalProfileByUserId(id, updateDto);
  }
}
