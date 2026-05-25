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
import { SessionDialysisSettingsService } from '../services';
import { CreateDialysisSettingsDto } from '../dto';

@ApiTags('Dialysis Session - Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dialysis-sessions/:sessionId/details/dialysis-settings')
export class DialysisSettingsController {
  constructor(
    private readonly dialysisSettingsService: SessionDialysisSettingsService,
  ) {}

  @Post()
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Record dialyzer settings such as blood flow, fluid flow, and filtration.',
  })
  async recordDialysisSettings(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: CreateDialysisSettingsDto,
  ) {
    return this.dialysisSettingsService.recordDialysisSettings(
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
      'View all device settings for a given session in chronological order.',
  })
  async getDialysisSettings(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.dialysisSettingsService.getSessionDialysisSettings(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }

  @Get('latest')
  @Roles(Role.NURSE, Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary:
      'View the last device settings registered for a particular session.',
  })
  async getLatestDialysisSettings(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.dialysisSettingsService.getLatestDialysisSettings(
      req.user.userId,
      req.user.role,
      sessionId,
    );
  }

  @Delete(':settingId')
  @Roles(Role.NURSE, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Delete a settings record from the same session when it was recorded by mistake.',
  })
  async deleteDialysisSettings(
    @Req() req: RequestWithUser,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Param('settingId', ParseIntPipe) settingId: number,
  ) {
    return this.dialysisSettingsService.deleteDialysisSettings(
      req.user.userId,
      req.user.role,
      sessionId,
      settingId,
    );
  }
}
