import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

interface AuthenticatedUser {
  userId: number;
  username: string;
  role: string;
  mustChangePassword?: boolean;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | undefined,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authenticatedUser = user as unknown as AuthenticatedUser;

    const isAllowedPasswordAction =
      request.url.includes('/auth/change-password') ||
      request.url.includes('/auth/set-initial-password') ||
      request.url.includes('/auth/skip-initial-password-change') ||
      request.url.includes('/change-password') ||
      request.url.includes('/set-initial-password') ||
      request.url.includes('/skip-initial-password-change');

    if (
      authenticatedUser.mustChangePassword === true &&
      !isAllowedPasswordAction
    ) {
      throw new ForbiddenException(
        'You must choose to change or skip the password first before continuing to use the system.',
      );
    }

    return user;
  }
}
