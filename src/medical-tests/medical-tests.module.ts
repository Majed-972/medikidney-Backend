import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { MedicalTestsController } from './medical-tests.controller';
import { MedicalTestsService } from './medical-tests.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [MedicalTestsController],
  providers: [MedicalTestsService],
})
export class MedicalTestsModule {}
