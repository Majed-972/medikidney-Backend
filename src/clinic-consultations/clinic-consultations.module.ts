import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClinicConsultationsController } from './clinic-consultations.controller';
import { ClinicConsultationsService } from './clinic-consultations.service';
import { DoctorScheduleModule } from '../doctor-schedule/doctor-schedule.module';

@Module({
  imports: [PrismaModule, DoctorScheduleModule],
  controllers: [ClinicConsultationsController],
  providers: [ClinicConsultationsService],
})
export class ClinicConsultationsModule {}
