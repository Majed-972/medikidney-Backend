import { Module } from '@nestjs/common';
import {
  VitalSignsController,
  MedicationsController,
  DialysisSettingsController,
  SymptomsController,
  SessionComprehensiveController,
} from './controllers';
import {
  DialysisSessionAccessService,
  DialysisSessionInsightsService,
  SessionVitalSignsService,
  SessionMedicationsService,
  SessionDialysisSettingsService,
  SessionSymptomsService,
} from './services';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    VitalSignsController,
    MedicationsController,
    DialysisSettingsController,
    SymptomsController,
    SessionComprehensiveController,
  ],
  providers: [
    DialysisSessionAccessService,
    DialysisSessionInsightsService,
    SessionVitalSignsService,
    SessionMedicationsService,
    SessionDialysisSettingsService,
    SessionSymptomsService,
  ],
  exports: [
    DialysisSessionAccessService,
    DialysisSessionInsightsService,
    SessionVitalSignsService,
    SessionMedicationsService,
    SessionDialysisSettingsService,
    SessionSymptomsService,
  ],
})
export class DialysisSessionDetailsModule {}
