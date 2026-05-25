import { Module } from '@nestjs/common';
import { DoctorScheduleService } from './doctor-schedule.service';
import { DoctorScheduleController } from './doctor-schedule.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DoctorScheduleService],
  controllers: [DoctorScheduleController],
  exports: [DoctorScheduleService],
})
export class DoctorScheduleModule {}
