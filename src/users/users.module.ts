import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { UsersAdminService } from './services/users.admin.service';
import { UsersController } from './controllers/users.controller';
import { UsersAdminController } from './controllers/users.admin.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService, UsersAdminService],
  exports: [UsersService, UsersAdminService],
})
export class UsersModule {}
