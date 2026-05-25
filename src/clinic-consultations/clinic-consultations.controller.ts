import {
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
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ClinicConsultationsService } from './clinic-consultations.service';
import { FilterClinicConsultationsDto } from './dto/filter-clinic-consultations.dto';
import { GetClinicConsultationAvailabilityDto } from './dto/get-clinic-consultation-availability.dto';
import { DoctorBookClinicConsultationDto } from './dto/doctor-book-clinic-consultation.dto';
import { PatientBookClinicConsultationDto } from './dto/patient-book-clinic-consultation.dto';
import { UpdateClinicConsultationStatusDto } from './dto/update-clinic-consultation-status.dto';

@ApiTags('Clinic Consultations')
@Controller('clinic-consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicConsultationsController {
  constructor(
    private readonly clinicConsultationsService: ClinicConsultationsService,
  ) {}

  @Post('book')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary:
      'Patients are allowed to book a consultation at the clinic with a specific doctor at a specific time.',
  })
  async patientBookClinicConsultation(
    @Req() req: RequestWithUser,
    @Body() dto: PatientBookClinicConsultationDto,
  ) {
    return this.clinicConsultationsService.patientBookClinicConsultation(
      req.user.userId,
      dto,
    );
  }

  @Post('patients/:patientId/book-by-doctor')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      'It allows the doctor to book a new review appointment for a specific patient from within his medical file.',
  })
  async doctorBookClinicConsultationForPatient(
    @Req() req: RequestWithUser,
    @Param('patientId', ParseIntPipe) patientId: number,
    @Body() dto: DoctorBookClinicConsultationDto,
  ) {
    return this.clinicConsultationsService.doctorBookClinicConsultationForPatient(
      req.user.userId,
      patientId,
      dto,
    );
  }
  @Get('availability')
  @Roles(Role.DOCTOR, Role.PATIENT)
  @ApiOperation({
    summary:
      'View available booking times for an in-office consultation for a specific doctor on a specific date. Patients can only see the available times of doctors they have appointments with or who have not been blocked by them.',
  })
  async getClinicConsultationAvailability(
    @Req() req: RequestWithUser,
    @Query() dto: GetClinicConsultationAvailabilityDto,
  ) {
    return this.clinicConsultationsService.getClinicConsultationAvailabilityForRequest(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Delete(':appointmentId')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary:
      'Patients are allowed to cancel a previously booked in-clinic consultation.',
  })
  async patientCancelClinicConsultation(
    @Req() req: RequestWithUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ) {
    return this.clinicConsultationsService.patientCancelClinicConsultation(
      req.user.userId,
      appointmentId,
    );
  }

  @Get()
  @Roles(Role.DOCTOR, Role.PATIENT, Role.NURSE, Role.NUTRITIONIST)
  @ApiOperation({
    summary:
      'View scheduled clinic consultations based on different user roles. Patients can see their upcoming appointments with doctors, while doctors can see all appointments scheduled with their patients, with options to filter results by date, condition, or specific limb.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Optional filter option by appointment date.',
    type: String,
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description: 'Optional filter option by doctor ID.',
    type: Number,
  })
  @ApiQuery({
    name: 'patientId',
    required: false,
    description: 'Optional filter option by patient ID.',
    type: Number,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Optional filter option by appointment status.',
  })
  async getClinicConsultations(
    @Req() req: RequestWithUser,
    @Query() filters: FilterClinicConsultationsDto,
  ) {
    return this.clinicConsultationsService.getClinicConsultationsForRequest(
      req.user.userId,
      req.user.role,
      filters,
    );
  }

  @Patch(':appointmentId/status')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      'Allows doctors to update the status of a scheduled appointment to Canceled, Complete, or No Show. This can help maintain accurate records of appointments and provide condition information to patients.',
    description:
      'Allows doctors to update the status of a scheduled appointment to Complete or No Show.',
  })
  async updateClinicConsultationStatus(
    @Req() req: RequestWithUser,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: UpdateClinicConsultationStatusDto,
  ) {
    return this.clinicConsultationsService.updateClinicConsultationStatusForDoctor(
      req.user.userId,
      appointmentId,
      dto,
    );
  }

  @Get('patients/:patientId/booking-access')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      'Allowing doctors to check if a particular patient can book in-clinic consultations with them. This can help manage access to booking, especially if the doctor has blocked the patient from booking due to past behavior or other reasons.',
  })
  async getPatientBookingAccess(
    @Req() req: RequestWithUser,
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.clinicConsultationsService.getPatientBookingAccessForDoctor(
      req.user.userId,
      patientId,
    );
  }

  @Post('patients/:patientId/allow-booking')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      'Allowing a previously blocked patient to book in-clinic consultations again with the approved doctor.',
  })
  async allowPatientBooking(
    @Req() req: RequestWithUser,
    @Param('patientId', ParseIntPipe) patientId: number,
  ) {
    return this.clinicConsultationsService.allowPatientBookingForDoctor(
      req.user.userId,
      patientId,
    );
  }
}
