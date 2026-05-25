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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Weekday } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { DialysisSchedulingService } from './dialysis-scheduling.service';
import { CreateDialysisScheduleDto } from './dto/create-dialysis-schedule.dto';
import { PatchDialysisScheduleDto } from './dto/patch-dialysis-schedule.dto';
import { UpdateTotalMachinesDto } from './dto/update-total-machine.dto';
import { AssignNurseDto } from './dto/assign-nurse.dto';

@ApiTags('Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dialysis-scheduling')
export class DialysisSchedulingController {
  constructor(
    private readonly dialysisSchedulingService: DialysisSchedulingService,
  ) {}

  @Post()
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Create a fixed weekly schedule for a patient' })
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateDialysisScheduleDto,
  ) {
    return this.dialysisSchedulingService.createSchedule(req.user.userId, dto);
  }

  @Patch(':scheduleId')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary: "Modifying one box in the patient's weekly schedule",
  })
  async patch(
    @Req() req: RequestWithUser,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
    @Body() dto: PatchDialysisScheduleDto,
  ) {
    return this.dialysisSchedulingService.patchSchedule(
      req.user.userId,
      scheduleId,
      dto,
    );
  }

  @Get()
  @Roles(Role.DOCTOR, Role.NURSE, Role.PATIENT)
  @ApiQuery({ name: 'patientId', required: false, type: Number })
  @ApiQuery({ name: 'weekday', required: false, enum: Weekday })
  @ApiQuery({ name: 'shiftNumber', required: false, type: Number })
  @ApiQuery({ name: 'machineNumber', required: false, type: Number })
  async getSchedules(
    @Req() req: RequestWithUser,
    @Query('patientId', new ParseIntPipe({ optional: true }))
    patientId?: number,
    @Query('weekday') weekday?: Weekday,
    @Query('shiftNumber', new ParseIntPipe({ optional: true }))
    shiftNumber?: number,
    @Query('machineNumber', new ParseIntPipe({ optional: true }))
    machineNumber?: number,
  ) {
    return this.dialysisSchedulingService.getSchedulesForRequest({
      requesterUserId: req.user.userId,
      requesterRole: req.user.role,
      patientIdFromQuery: patientId,
      weekday,
      shiftNumber,
      machineNumber,
    });
  }

  @Get('weekly-overview')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({
    summary: 'Returns the static weekly schedule grouped by day and shift',
  })
  async getWeeklyOverview(@Req() req: RequestWithUser) {
    return this.dialysisSchedulingService.getWeeklyOverview(
      req.user.userId,
      req.user.role,
    );
  }

  @Get('machines')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({
    summary: 'List of partition devices with maintenance status',
  })
  async listMachines() {
    return this.dialysisSchedulingService.listMachinesForScheduling();
  }

  @Get('machines/summary')
  @Roles(Role.DOCTOR, Role.NURSE)
  @ApiOperation({
    summary: 'Summary of the total number of devices and maintenance status',
  })
  async getMachinesSummary() {
    return this.dialysisSchedulingService.getMachinesSummary();
  }

  @Patch('machines/total')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      'Update the total number of devices and verify its compatibility with the current weekly schedule',
  })
  @ApiResponse({
    status: 200,
    description: 'The number of devices has been updated successfully',
  })
  @ApiResponse({
    status: 409,
    description:
      'The new issue conflicts with some codes or with available devices',
  })
  async updateTotalMachines(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateTotalMachinesDto,
  ) {
    return this.dialysisSchedulingService.updateTotalMachines(
      req.user.userId,
      dto,
    );
  }

  @Get('nurse/today')
  @Roles(Role.NURSE)
  @ApiOperation({
    summary:
      "View the nurse's daily interactions with patients and the daily session recording status",
  })
  async getTodayForNurse() {
    return this.dialysisSchedulingService.getTodayForNurse();
  }

  @Post('assign-nurse')
  @Roles(Role.NURSE)
  @ApiOperation({
    summary:
      'The nurse has booked a patient into scheduling for the current day',
  })
  async assignNurse(@Req() req: RequestWithUser, @Body() dto: AssignNurseDto) {
    return this.dialysisSchedulingService.assignNurse(req.user.userId, dto);
  }

  @Delete('assign-nurse/:scheduleId')
  @Roles(Role.NURSE)
  @ApiOperation({ summary: "Cancel the nurse's reservation for a patient" })
  async removeNurseAssignment(
    @Req() req: RequestWithUser,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
  ) {
    return this.dialysisSchedulingService.removeNurseAssignment(
      req.user.userId,
      scheduleId,
    );
  }

  @Get(':scheduleId')
  @Roles(Role.DOCTOR, Role.NURSE, Role.PATIENT)
  @ApiOperation({ summary: 'View details of one slot of the weekly schedule' })
  async getScheduleDetail(
    @Req() req: RequestWithUser,
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
  ) {
    return this.dialysisSchedulingService.getScheduleDetailForRequest({
      requesterUserId: req.user.userId,
      requesterRole: req.user.role,
      scheduleId,
    });
  }
}
