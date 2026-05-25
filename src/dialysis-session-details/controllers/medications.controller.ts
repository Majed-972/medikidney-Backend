import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { SessionMedicationsService } from '../services';
import { CreateMedicationDto } from '../dto';

@ApiTags('Dialysis Session - Medications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dialysis-sessions/:sessionId/details/medications')
export class MedicationsController {
  constructor(private readonly medicationsService: SessionMedicationsService) {}

  @Post()
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary: 'Recording a medication given to the patient during the session.',
  })
  async recordMedication(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.medicationsService.recordMedication(
      req.user.userId,
      req.user.role,
      sessionId,
      dto,
    );
  }

  @Get()
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary:
      'View all medications administered in a given session in chronological order.',
  })
  async getMedications(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.medicationsService.getSessionMedications(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }

  @Delete(':medicationId')
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Deleting a medication record from the same session when it was recorded by mistake.',
  })
  async deleteMedication(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('medicationId', ParseIntPipe) medicationId: number,
  ) {
    return this.medicationsService.deleteMedication(
      req.user.userId,
      req.user.role,
      sessionId,
      medicationId,
    );
  }
}
