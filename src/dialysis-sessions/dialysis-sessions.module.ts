import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { DialysisSessionsController } from './dialysis-sessions.controller';
import { DialysisSessionsService } from './dialysis-sessions.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DialysisSessionsController],
  providers: [DialysisSessionsService],
})
export class DialysisSessionsModule {}
