import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  imports: [PrismaModule],
})
export class ReportsModule {}
