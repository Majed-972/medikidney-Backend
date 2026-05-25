import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import {
  createPdfUploadOptions,
  deleteStoredUploadIfExists,
  getStoredUploadAccessUrl,
  PDF_UPLOAD_MAX_FILE_SIZE,
  uploadPdfToStorage,
} from 'src/common/file-upload.util';
import { CompleteMedicalTestDto } from './dto/complete-medical-test.dto';
import { CreateMedicalTestDto } from './dto/create-medical-test.dto';
import { FilterMedicalTestsDto } from './dto/filter-medical-tests.dto';
import { MedicalTestsService } from './medical-tests.service';

type UploadedPdfFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@ApiTags('Medical Tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('medical-tests')
export class MedicalTestsController {
  constructor(private readonly medicalTestsService: MedicalTestsService) {}

  @Post()
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Create a medical test request for a patient.' })
  async create(@Req() req: RequestWithUser, @Body() dto: CreateMedicalTestDto) {
    return this.medicalTestsService.create(req.user.userId, dto);
  }

  @Patch(':testId/complete')
  @Roles(Role.LAB_TECH)
  @UseInterceptors(FileInterceptor('file', createPdfUploadOptions()))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'PDF file data for the medical examination result. The file must be in PDF format and not exceed 20 MB.',
        },
        result: {
          type: 'string',
          example: 'medical-tests/medical-test-24-result.pdf',
          description:
            'Optional path to a result file previously uploaded to storage.',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Complete the laboratory test request by uploading a PDF of the result or passing a previously saved path to storage.',
  })
  async complete(
    @Req() req: RequestWithUser,
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: CompleteMedicalTestDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: PDF_UPLOAD_MAX_FILE_SIZE })
        .build({
          fileIsRequired: false,
          errorHttpStatusCode: 400,
        }),
    )
    file?: UploadedPdfFile,
  ) {
    let uploadedPath: string | undefined;

    try {
      if (file) {
        uploadedPath = await uploadPdfToStorage(
          file,
          'medical-tests',
          'medical-test',
        );
      }

      const resultPath = uploadedPath ?? dto.result?.trim();

      if (!resultPath) {
        throw new BadRequestException(
          'A PDF file must be uploaded before completing the laboratory test request.',
        );
      }

      return await this.medicalTestsService.complete(
        req.user.userId,
        testId,
        resultPath,
      );
    } catch (error) {
      if (uploadedPath) {
        await deleteStoredUploadIfExists(uploadedPath);
      }
      throw error;
    }
  }

  @Get(':testId/result-url')
  @Roles(
    Role.DOCTOR,
    Role.PATIENT,
    Role.LAB_TECH,
    Role.ADMIN,
    Role.NURSE,
    Role.NUTRITIONIST,
  )
  @ApiOperation({
    summary: 'Returns a temporary link to access the scan result file.',
  })
  async getResultUrl(
    @Req() req: RequestWithUser,
    @Param('testId', ParseIntPipe) testId: number,
  ) {
    const storedPath = await this.medicalTestsService.getResultPathForRequest(
      req.user.userId,
      req.user.role,
      testId,
    );
    const requestOrigin = `${req.protocol}://${req.get('host')}`;

    return {
      url: await getStoredUploadAccessUrl(storedPath, requestOrigin),
    };
  }

  @Patch(':testId/mark-seen')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary:
      'Mark the medical examination request as having been reviewed by the doctor who requested it.',
  })
  async markSeen(
    @Req() req: RequestWithUser,
    @Param('testId', ParseIntPipe) testId: number,
  ) {
    return this.medicalTestsService.markSeen(req.user.userId, testId);
  }

  @Get()
  @Roles(
    Role.DOCTOR,
    Role.PATIENT,
    Role.LAB_TECH,
    Role.ADMIN,
    Role.NUTRITIONIST,
    Role.NURSE,
  )
  @ApiOperation({
    summary:
      'List of medical examination requests related to the user based on his role.',
  })
  async findAll(
    @Req() req: RequestWithUser,
    @Query() filters: FilterMedicalTestsDto,
  ) {
    const records = await this.medicalTestsService.findAllForRequest(
      req.user.userId,
      req.user.role,
      filters,
    );
    return records;
  }
}
