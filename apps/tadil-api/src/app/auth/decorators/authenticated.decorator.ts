import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

export const AUTHENTICATED_KEY = 'authenticated';
export const Authenticated = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().staffUser
);
export const CurrentUser = Authenticated;
export const AUTHENTICATED_ROUTE_KEY = 'authenticatedRoute';
export const AuthenticatedRoute = () =>
  SetMetadata(AUTHENTICATED_ROUTE_KEY, true);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
