import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { RadiologyRequestsController } from './radiology-requests.controller';
import { RadiologyRequestsService } from './radiology-requests.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [RadiologyRequestsController],
  providers: [RadiologyRequestsService],
})
export class RadiologyRequestsModule {}
