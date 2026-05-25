import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteRadiologyRequestDto {
  @ApiPropertyOptional({
    example: '/uploads/radiology-requests/radiology-request-24-result.pdf',
    description:
      'X-ray request result file. It can be a link to an uploaded file or simple text to describe the result. This field is optional and can be left blank if there is no specific result to provide.',
  })
  @IsOptional()
  @IsString()
  image_path?: string;

  @ApiPropertyOptional({
    example: 'Final radiology report uploaded and linked to the request.',
    description:
      'Description of the result of the x-ray request. This field is optional and can be left blank if there is no specific result to provide.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
