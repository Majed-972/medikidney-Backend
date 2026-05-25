import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { CreateNutritionProgramDto } from './dto/create-nutrition-program.dto';
import { UpdateNutritionProgramDto } from './dto/update-nutrition-program.dto';
import { NutritionProgramService } from './nutrition-program.service';

@ApiTags('Nutrition Programs')
@Controller('nutrition-programs')
export class NutritionProgramController {
  constructor(
    private readonly nutritionProgramService: NutritionProgramService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.NUTRITIONIST, Role.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a nutrition program/plan (NUTRITIONIST or DOCTOR)',
  })
  async createProgram(
    @Req() req: RequestWithUser,
    @Body() dto: CreateNutritionProgramDto,
  ) {
    return this.nutritionProgramService.createProgram(
      req.user.userId,
      req.user.role,
      dto,
    );
  }

  @Patch(':programId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.NUTRITIONIST, Role.DOCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifying a nutrition program/plan' })
  async updateProgram(
    @Req() req: RequestWithUser,
    @Param('programId', ParseIntPipe) programId: number,
    @Body() dto: UpdateNutritionProgramDto,
  ) {
    return this.nutritionProgramService.updateProgram(
      req.user.userId,
      req.user.role,
      programId,
      dto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.NUTRITIONIST, Role.DOCTOR, Role.PATIENT, Role.NURSE)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'View nutrition programs. Staff can pass the patientId into the query (optional), and the patient only sees their programs',
  })
  @ApiQuery({
    name: 'patientId',
    required: false,
    description: 'Optional for medical staff, and ignored for the patient',
    type: Number,
  })
  async getPrograms(
    @Req() req: RequestWithUser,
    @Query('patientId', new ParseIntPipe({ optional: true }))
    patientId?: number,
  ) {
    return this.nutritionProgramService.getProgramsForRequest(
      req.user.userId,
      req.user.role,
      patientId,
    );
  }

  @Get(':programId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.NUTRITIONIST, Role.DOCTOR, Role.PATIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'View details of one nutrition program' })
  async getProgramDetail(
    @Req() req: RequestWithUser,
    @Param('programId', ParseIntPipe) programId: number,
  ) {
    return this.nutritionProgramService.getProgramDetailForRequest(
      req.user.userId,
      req.user.role,
      programId,
    );
  }
}
