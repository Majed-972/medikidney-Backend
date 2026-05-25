import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { NutritionProgramModule } from './nutrition-program/nutrition-program.module';
import { DialysisSessionsModule } from './dialysis-sessions/dialysis-sessions.module';
import { DialysisSchedulingModule } from './dialysis-scheduling/dialysis-scheduling.module';
import { ClinicConsultationsModule } from './clinic-consultations/clinic-consultations.module';
import { DoctorScheduleModule } from './doctor-schedule/doctor-schedule.module';
import { MedicalTestsModule } from './medical-tests/medical-tests.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { RadiologyRequestsModule } from './radiology-requests/radiology-requests.module';
import { DialysisSessionDetailsModule } from './dialysis-session-details/dialysis-session-details.module';
import { NotificationsModule } from './notifications/notifications.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ReportsModule,
    UsersModule,
    NutritionProgramModule,
    DialysisSessionsModule,
    DialysisSchedulingModule,
    ClinicConsultationsModule,
    DoctorScheduleModule,
    MedicalTestsModule,
    PrescriptionsModule,
    RadiologyRequestsModule,
    DialysisSessionDetailsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
