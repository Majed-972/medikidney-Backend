import type { Request } from 'express';
import { Role } from '@prisma/client';

export interface RequestWithUser extends Request {
  user: {
    userId: number;
    username: string;
    role: Role;
    mustChangePassword: boolean;
  };
}
