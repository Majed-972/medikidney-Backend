import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DialysisSessionsService } from './dialysis-sessions.service';
import { CreateDialysisSessionDto } from './dto/create-dialysis-session.dto';
import { UpdateDialysisSessionStatusDto } from './dto/update-dialysis-session-status.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Dialysis Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dialysis-sessions')
export class DialysisSessionsController {
  constructor(
    private readonly dialysisSessionsService: DialysisSessionsService,
  ) {}

  @Post()
  @Roles(Role.NURSE)
  @ApiOperation({
    summary:
      'Establishment of an actual washing session by the nurse based on the weekly schedule',
  })
  async createDialysisSession(
    @Req() req: RequestWithUser,
    @Body() dto: CreateDialysisSessionDto,
  ) {
    return this.dialysisSessionsService.createSession(req.user.userId, dto);
  }

  @Patch(':sessionId/status')
  @Roles(Role.NURSE, Role.PATIENT)
  @ApiOperation({ summary: 'Update the status of the actual washing session' })
  async updateDialysisSessionStatus(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: UpdateDialysisSessionStatusDto,
  ) {
    return this.dialysisSessionsService.updateSessionStatus(
      req.user.userId,
      req.user.role,
      sessionId,
      dto,
    );
  }

  @Get()
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT, Role.NUTRITIONIST)
  @ApiOperation({ summary: 'View actual washing sessions' })
  @ApiQuery({
    name: 'patientId',
    required: false,
    type: Number,
    description: 'Optional for medical staff',
  })
  async getSessionsByPatient(
    @Req() req: RequestWithUser,
    @Query('patientId', new ParseIntPipe({ optional: true }))
    patientId?: number,
  ) {
    return this.dialysisSessionsService.getSessionsForRequest(
      req.user.userId,
      req.user.role,
      patientId,
    );
  }

  @Get(':sessionId')
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({ summary: 'View details of an actual washing session' })
  async getSessionDetail(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.dialysisSessionsService.getSessionDetailForRequest(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }
}
