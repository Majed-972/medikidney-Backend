import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteMedicalTestDto {
  @ApiPropertyOptional({
    example: '/uploads/medical-tests/medical-test-24-result.pdf',
    description:
      'Medical examination result file. It can be a link to an uploaded file or simple text to describe the result. This field is optional and can be left blank if there is no specific result to provide.',
  })
  @IsOptional()
  @IsString()
  result?: string;
}
