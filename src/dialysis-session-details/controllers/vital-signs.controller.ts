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
import { SessionVitalSignsService } from '../services';
import { CreateVitalSignsDto } from '../dto';

@ApiTags('Dialysis Session - Vital Signs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dialysis-sessions/:sessionId/details/vital-signs')
export class VitalSignsController {
  constructor(private readonly vitalSignsService: SessionVitalSignsService) {}

  @Post()
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Record a new vital reading (blood pressure, pulse, temperature, and oxygen saturation).',
  })
  async recordVitalSigns(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateVitalSignsDto,
  ) {
    return this.vitalSignsService.recordVitalSigns(
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
      'View all vital readings for a given session in chronological order.',
  })
  async getVitalSigns(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.vitalSignsService.getSessionVitalSigns(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }

  @Get('latest')
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary: 'View the latest vital reading for a particular session.',
  })
  async getLatestVitalSigns(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.vitalSignsService.getLatestVitalSigns(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }

  @Delete(':vitalSignId')
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Deleting a dynamic reading from the same session when it was recorded by mistake.',
  })
  async deleteVitalSign(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('vitalSignId', ParseIntPipe) vitalSignId: number,
  ) {
    return this.vitalSignsService.deleteVitalSign(
      req.user.userId,
      req.user.role,
      sessionId,
      vitalSignId,
    );
  }
}
