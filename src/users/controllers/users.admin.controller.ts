import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersAdminService } from '../services/users.admin.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { CreateUserDto } from '../dto/create-user.dto';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@ApiTags('User Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/admin')
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Post('create')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Create a new user (admin or department head)' })
  async createUser(@Body() dto: CreateUserDto, @Req() req: RequestWithUser) {
    return this.usersAdminService.createUser(
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch('toggle-access/:id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiParam({ name: 'id', type: Number })
  @ApiOperation({ summary: 'Deactivate/activate an account' })
  async toggleAccess(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.usersAdminService.toggleUserAccess(
      parseInt(id, 10),
      req.user.userId,
      req.user.role,
    );
  }
}
