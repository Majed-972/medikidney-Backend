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
import { SessionSymptomsService } from '../services';
import { CreateSymptomDto } from '../dto';

@ApiTags('Dialysis Session - Symptoms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dialysis-sessions/:sessionId/details/symptoms')
export class SymptomsController {
  constructor(private readonly symptomsService: SessionSymptomsService) {}

  @Post()
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Recording of an incident or clinical event during a washing session.',
  })
  async recordSymptom(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateSymptomDto,
  ) {
    return this.symptomsService.recordSymptom(
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
      'View all symptoms and events for a given session in chronological order.',
  })
  async getSymptoms(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.symptomsService.getSessionSymptoms(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }

  @Get('statistics')
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary: 'View statistics of symptoms and events within a given session.',
  })
  async getSymptomsStatistics(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.symptomsService.getSymptomsStatistics(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }

  @Delete(':symptomId')
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Delete a viewer log from the same session when it was recorded by mistake.',
  })
  async deleteSymptom(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('symptomId', ParseIntPipe) symptomId: number,
  ) {
    return this.symptomsService.deleteSymptom(
      req.user.userId,
      req.user.role,
      sessionId,
      symptomId,
    );
  }
}
