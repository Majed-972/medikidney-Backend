import {
  Controller,
  Get,
  Param,
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
import { DialysisSessionInsightsService } from '../services';

@ApiTags('Dialysis Session - Comprehensive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dialysis-sessions')
export class SessionComprehensiveController {
  constructor(
    private readonly insightsService: DialysisSessionInsightsService,
  ) {}

  @Get('patient/:patientId/last-session')
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary:
      "Brings all information of the patient's last completed session (vital status, medications, device settings, symptoms) for display in the patient file.",
  })
  async getPatientLastCompleteSession(
    @Req() req: RequestWithUser,
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.insightsService.getPatientLastCompleteSession(
      req.user.userId,
      req.user.role,
      patientId,
    );
  }

  @Get(':sessionId/timeline')
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary:
      'Brings the complete timeline of your washing session: vital readings, medications, device settings, and symptoms arranged chronologically.',
  })
  async getSessionTimeline(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.insightsService.getSessionTimeline(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }
}
