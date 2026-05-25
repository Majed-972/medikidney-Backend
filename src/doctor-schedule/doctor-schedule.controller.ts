import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';
import { DoctorScheduleService } from './doctor-schedule.service';

@ApiTags('Doctor Schedule')
@Controller('doctor-schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorScheduleController {
  constructor(
    private readonly doctorScheduleService: DoctorScheduleService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      "Create or update a doctor's appointment schedule for a specific day of the week. If the day already exists, it will be updated. If it does not exist, it will be created.",
  })
  async createOrUpdateSchedule(
    @Req() req: RequestWithUser,
    @Body() dto: CreateDoctorScheduleDto,
  ) {
    return this.doctorScheduleService.createOrUpdateSchedule(
      req.user.userId,
      dto,
    );
  }

  @Delete(':weekday')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      "Delete a day from the physician's weekly schedule for validation treatment.",
  })
  async deleteScheduleDay(
    @Req() req: RequestWithUser,
    @Param('weekday') weekday: string,
  ) {
    return this.doctorScheduleService.deleteScheduleDay(
      req.user.userId,
      weekday,
    );
  }

  @Get()
  @Roles(Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary:
      "Return the doctor's schedule. Doctors get their own schedule automatically, while patients must specify a doctorId to get a specific doctor's schedule.",
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description:
      "Required if user is a requester (patient) for a specific doctor's schedule. Not required for doctors who get their own schedule.",
    type: Number,
  })
  async getDoctorSchedule(
    @Req() req: RequestWithUser,
    @Query('doctorId', new ParseIntPipe({ optional: true }))
    doctorId?: number,
  ) {
    if (req.user.role === Role.DOCTOR) {
      const doctorData = await this.prisma.doctor.findUnique({
        where: { user_id: req.user.userId },
        select: { doctor_id: true },
      });

      if (!doctorData) {
        throw new BadRequestException(
          'The doctor file was not found for this account.',
        );
      }

      return this.doctorScheduleService.getDoctorSchedule(doctorData.doctor_id);
    }

    if (!doctorId) {
      throw new BadRequestException(
        "The doctorId number is required for patients to obtain a doctor's schedule.",
      );
    }

    return this.doctorScheduleService.getDoctorSchedule(doctorId);
  }
}
