import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { FilterPrescriptionsDto } from './dto/filter-prescriptions.dto';
import { PrescriptionsService } from './prescriptions.service';
import { UpdatePrescriptionDispenseDto } from './dto/update-prescription-dispense.dto';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary: 'Creating a prescription for a patient by a doctor',
  })
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(req.user.userId, dto);
  }

  @Delete(':prescriptionId')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary: 'Delete a prescription before it begins to be dispensed',
  })
  async deletePrescription(
    @Req() req: RequestWithUser,
    @Param('prescriptionId', ParseIntPipe) prescriptionId: number,
  ) {
    return this.prescriptionsService.delete(req.user.userId, prescriptionId);
  }

  @Patch(':prescriptionId/dispense')
  @Roles(Role.PHARMACIST)
  @ApiOperation({
    summary:
      'Updating the status of dispensing prescription medications by the pharmacist',
  })
  async markDispensed(
    @Req() req: RequestWithUser,
    @Param('prescriptionId', ParseIntPipe) prescriptionId: number,
    @Body() dto: UpdatePrescriptionDispenseDto,
  ) {
    return this.prescriptionsService.markDispensed(
      req.user.userId,
      prescriptionId,
      dto,
    );
  }

  @Get()
  @Roles(
    Role.DOCTOR,
    Role.PATIENT,
    Role.PHARMACIST,
    Role.ADMIN,
    Role.NUTRITIONIST,
    Role.NURSE,
  )
  @ApiOperation({
    summary: 'Display drug prescriptions according to user validity',
  })
  async findAll(
    @Req() req: RequestWithUser,
    @Query() filters: FilterPrescriptionsDto,
  ) {
    return this.prescriptionsService.findAllForRequest(
      req.user.userId,
      req.user.role,
      filters,
    );
  }
}
