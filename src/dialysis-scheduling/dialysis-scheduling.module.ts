import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DialysisSchedulingController } from 'src/dialysis-scheduling/dialysis-scheduling.controller';
import { DialysisSchedulingService } from 'src/dialysis-scheduling/dialysis-scheduling.service';

@Module({
  imports: [PrismaModule],
  controllers: [DialysisSchedulingController],
  providers: [DialysisSchedulingService],
})
export class DialysisSchedulingModule {}
