import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dept-stats')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Fetch general system statistics' })
  @ApiResponse({ status: 200, description: 'Statistics fetched successfully' })
  async getStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('doctors')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Bring a list of doctors' })
  @ApiQuery({ name: 'search', required: false })
  async getDoctors(@Query('search') search?: string) {
    return this.reportsService.getDoctors(search);
  }

  @Get('booking-doctors')
  @Roles(Role.PATIENT, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Fetch the list of available doctors to choose a doctor before booking a clinic appointment from the patient application.',
  })
  @ApiQuery({ name: 'search', required: false })
  async getBookingDoctors(@Query('search') search?: string) {
    return this.reportsService.getBookingDoctors(search);
  }

  @Get('nurses')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Bring a list of nurses' })
  @ApiQuery({ name: 'search', required: false })
  async getNurses(@Query('search') search?: string) {
    return this.reportsService.getNurses(search);
  }

  @Get('patients')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      'Bring a list of patients with new outcome indicators to the doctor',
  })
  @ApiQuery({ name: 'search', required: false })
  async getPatients(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
  ) {
    return this.reportsService.getPatients(req.user.userId, search);
  }

  @Get('pharmacists')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Get a list of pharmacists (admin specific)' })
  @ApiQuery({ name: 'search', required: false })
  async getPharmacists(@Query('search') search?: string) {
    return this.reportsService.getPharmacists(search);
  }

  @Get('lab-specialists')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Get a list of laboratory technicians (admin specific)',
  })
  @ApiQuery({ name: 'search', required: false })
  async getLabTechs(@Query('search') search?: string) {
    return this.reportsService.getLabSpecialists(search);
  }

  @Get('nutritionists')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Get a list of nutritionists (admin specific)' })
  @ApiQuery({ name: 'search', required: false })
  async getNutritionists(@Query('search') search?: string) {
    return this.reportsService.getNutritionists(search);
  }

  @Get('radiologists')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a list of radiographers (admin specific)' })
  @ApiQuery({ name: 'search', required: false })
  async getRadiologists(@Query('search') search?: string) {
    return this.reportsService.getRadiologists(search);
  }
}
