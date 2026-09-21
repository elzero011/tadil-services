import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { staffUser?: unknown }>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.origin;
      const allowed = (process.env.STAFF_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (!origin || !allowed.includes(origin))
        throw new ForbiddenException('Origin is not allowed');
    }
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !request.headers['x-csrf-token']
    ) {
      throw new ForbiddenException('X-CSRF-Token is required');
    }
    const csrf = request.headers['x-csrf-token'] as string | undefined;
    const session = await this.auth.loadSession(
      request.cookies?.staff_session,
      csrf,
      request.method
    );
    if (!session) throw new UnauthorizedException();
    request.staffUser = session.user;
    (request as Request & { staff?: unknown }).staff = session.user;
    return true;
  }
}
