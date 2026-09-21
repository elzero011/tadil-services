import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  Authenticated,
  AuthenticatedRoute,
  RequirePermissions,
} from './decorators/authenticated.decorator';
import { Public } from './decorators/public.decorator';
import { PERMISSIONS } from './permissions';

const cookieOptions = (httpOnly = true) => ({
  httpOnly,
  sameSite: 'lax' as const,
  secure:
    process.env.NODE_ENV === 'production' ||
    process.env.STAFF_SESSION_SECURE === 'true',
  path: '/',
});
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Post('login') async login(
    @Req() request: Request,
    @Body() body: any,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.auth.login(body.email, body.password, request.ip);
    response.cookie('staff_session', result.token, cookieOptions());
    return result.user;
  }
  @AuthenticatedRoute() @Get('me') me(@Authenticated() user: any) {
    return user;
  }
  @AuthenticatedRoute() @Post('logout') async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    await this.auth.logout(request.cookies?.staff_session);
    response.clearCookie('staff_session', cookieOptions());
    return { ok: true };
  }
  @AuthenticatedRoute() @Post('password') async password(
    @Authenticated() user: any,
    @Body() body: any
  ) {
    await this.auth.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword
    );
    return { ok: true };
  }
  @Public() @Post('accept-invitation') async accept(@Body() body: any) {
    await this.auth.acceptToken(body.token, body.password);
    return { ok: true };
  }
}
@Controller('staff/users')
@RequirePermissions('staff.read')
export class StaffUsersController {
  constructor(private readonly auth: AuthService) {}
  @Get() list() {
    return this.auth.accounts();
  }
  @Post() @RequirePermissions('staff.read', 'staff.create') create(
    @Authenticated() user: any,
    @Body() body: any
  ) {
    return this.auth.createAccount(user, body);
  }
  @Patch(':id') @RequirePermissions('staff.read', 'staff.update') update(
    @Authenticated() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.auth.updateAccount(user, id, body);
  }
  @Post(':id/invitation')
  @RequirePermissions('staff.read', 'staff.update')
  invite(@Authenticated() user: any, @Param('id') id: string) {
    return this.auth.issueInvitation(user, id, 'invitation');
  }
  @Post(':id/reset-password')
  @RequirePermissions('staff.read', 'staff.update')
  reset(@Authenticated() user: any, @Param('id') id: string) {
    return this.auth.issueInvitation(user, id, 'reset-password');
  }
}
@Controller('staff/roles')
@RequirePermissions('roles.read')
export class StaffRolesController {
  constructor(private readonly auth: AuthService) {}
  @Get() list() {
    return this.auth.roles();
  }
  @Post() @RequirePermissions('roles.read', 'roles.create') create(
    @Authenticated() user: any,
    @Body() body: any
  ) {
    return this.auth.createRole(user, body);
  }
  @Patch(':id') @RequirePermissions('roles.read', 'roles.update') update(
    @Authenticated() user: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.auth.updateRole(user, id, body);
  }
  @Delete(':id') @RequirePermissions('roles.read', 'roles.delete') remove(
    @Authenticated() user: any,
    @Param('id') id: string
  ) {
    return this.auth.deleteRole(user, id);
  }
}
@Controller('staff/permissions')
@RequirePermissions('staff.read')
export class StaffPermissionsController {
  @Get() list() {
    return { permissions: PERMISSIONS };
  }
}
