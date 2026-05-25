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
import { CompleteRadiologyRequestDto } from './dto/complete-radiology-request.dto';
import { CreateRadiologyRequestDto } from './dto/create-radiology-request.dto';
import { FilterRadiologyRequestsDto } from './dto/filter-radiology-requests.dto';
import { RadiologyRequestsService } from './radiology-requests.service';

type UploadedPdfFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@ApiTags('Radiology Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('radiology-requests')
export class RadiologyRequestsController {
  constructor(
    private readonly radiologyRequestsService: RadiologyRequestsService,
  ) {}

  @Post()
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Create an x-ray request' })
  @ApiBody({
    description:
      'Physicians can create a radiology order without assigning a specific radiologist.',
    schema: {
      type: 'object',
      required: ['patient_id', 'image_type'],
      properties: {
        patient_id: { type: 'number', example: 12 },
        radiologist_id: {
          type: 'number',
          example: 5,
          nullable: true,
          description: 'Optional.',
        },
        image_type: { type: 'string', example: 'CT Scan' },
        description: {
          type: 'string',
          example: 'Abdominal imaging with dye when needed',
          nullable: true,
        },
      },
      example: {
        patient_id: 12,
        image_type: 'CT Scan',
        description: 'Abdominal imaging with dye when needed',
      },
    },
  })
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateRadiologyRequestDto,
  ) {
    return this.radiologyRequestsService.create(req.user.userId, dto);
  }

  @Patch(':imageId/complete')
  @Roles(Role.RADIOLOGIST)
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
            'Radiology result file to upload and store in Supabase Storage.',
        },
        image_path: {
          type: 'string',
          example: 'radiology-requests/radiology-request-24-result.pdf',
          description:
            'Optional path to a file previously uploaded to storage.',
        },
        description: {
          type: 'string',
          example:
            'The final radiology report has been uploaded and linked to the application.',
          description: 'Optional description of the result.',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Complete a radiology request by uploading a PDF of the result or passing a previously saved path to storage.',
  })
  async completeRequest(
    @Req() req: RequestWithUser,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Body() dto: CompleteRadiologyRequestDto,
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
          'radiology-requests',
          'radiology-request',
        );
      }

      const imagePath = uploadedPath ?? dto.image_path?.trim();

      if (!imagePath) {
        throw new BadRequestException(
          'A PDF file must be uploaded before completing the radiology request.',
        );
      }

      return await this.radiologyRequestsService.completeRequest(
        req.user.userId,
        imageId,
        imagePath,
        dto.description,
      );
    } catch (error) {
      if (uploadedPath) {
        await deleteStoredUploadIfExists(uploadedPath);
      }
      throw error;
    }
  }

  @Get(':imageId/file-url')
  @Roles(
    Role.DOCTOR,
    Role.PATIENT,
    Role.RADIOLOGIST,
    Role.ADMIN,
    Role.NURSE,
    Role.NUTRITIONIST,
  )
  @ApiOperation({
    summary: 'Returns a temporary link to access the radiology result file.',
  })
  async getFileUrl(
    @Req() req: RequestWithUser,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    const storedPath =
      await this.radiologyRequestsService.getImagePathForRequest(
        req.user.userId,
        req.user.role,
        imageId,
      );
    const requestOrigin = `${req.protocol}://${req.get('host')}`;

    return {
      url: await getStoredUploadAccessUrl(storedPath, requestOrigin),
    };
  }

  @Patch(':imageId/mark-seen')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary: 'X-ray order mark as readable by the physician who ordered it.',
  })
  async markSeen(
    @Req() req: RequestWithUser,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.radiologyRequestsService.markSeen(req.user.userId, imageId);
  }

  @Get()
  @Roles(
    Role.DOCTOR,
    Role.PATIENT,
    Role.RADIOLOGIST,
    Role.ADMIN,
    Role.NUTRITIONIST,
    Role.NURSE,
  )
  @ApiOperation({
    summary:
      'List of radiology requests with the ability to apply filtering by patient.',
  })
  async findAll(
    @Req() req: RequestWithUser,
    @Query() filters: FilterRadiologyRequestsDto,
  ) {
    const records = await this.radiologyRequestsService.findAllForRequest(
      req.user.userId,
      req.user.role,
      filters,
    );
    return records;
  }
}
