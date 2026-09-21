import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTHENTICATED_ROUTE_KEY } from '../decorators/authenticated.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}
  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const required = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    const authenticated = this.reflector.getAllAndOverride<boolean>(
      AUTHENTICATED_ROUTE_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!required?.length && !authenticated)
      throw new ForbiddenException('Permission required');
    const request = context.switchToHttp().getRequest();
    const user = request.staff ?? request.staffUser;
    if (authenticated && !request.staffUser)
      throw new ForbiddenException('Authentication required');
    if (!required?.length) return true;
    if (!user || !this.auth.hasPermissions(user, required))
      throw new ForbiddenException();
    return true;
  }
}
