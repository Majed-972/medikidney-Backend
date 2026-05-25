import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NutritionProgramController } from './nutrition-program.controller';
import { NutritionProgramService } from './nutrition-program.service';

@Module({
  imports: [PrismaModule],
  controllers: [NutritionProgramController],
  providers: [NutritionProgramService],
})
export class NutritionProgramModule {}
