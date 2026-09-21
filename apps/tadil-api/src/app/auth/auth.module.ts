import { Module } from '@nestjs/common';
import {
  AuthController,
  StaffPermissionsController,
  StaffRolesController,
  StaffUsersController,
} from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './guards/session.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [
    AuthController,
    StaffUsersController,
    StaffRolesController,
    StaffPermissionsController,
  ],
  providers: [AuthService, SessionGuard, PermissionsGuard],
  exports: [AuthService, SessionGuard, PermissionsGuard],
})
export class AuthModule {}
