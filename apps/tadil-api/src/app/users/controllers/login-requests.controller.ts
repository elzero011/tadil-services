import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  GetPendingLoginRequestsUseCase,
  ApproveLoginRequestUseCase,
  RejectLoginRequestUseCase,
} from '@tadil-auth';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('login-requests')
@ApiTags('Login Requests')
export class LoginRequestsController {
  constructor(
    private readonly _getPendingLoginRequestsUseCase: GetPendingLoginRequestsUseCase,
    private readonly _approveLoginRequestUseCase: ApproveLoginRequestUseCase,
    private readonly _rejectLoginRequestUseCase: RejectLoginRequestUseCase
  ) {}

  @Get('/pending')
  @RequirePermissions('login_requests.read')
  @ApiOperation({ summary: 'Get all pending login requests' })
  async getPending() {
    return this._getPendingLoginRequestsUseCase.execute();
  }

  @Post('/:id/approve')
  @RequirePermissions('login_requests.read', 'login_requests.approve')
  @ApiOperation({ summary: 'Approve a login request' })
  async approve(@Param('id') id: string) {
    return this._approveLoginRequestUseCase.execute(id);
  }

  @Post('/:id/reject')
  @RequirePermissions('login_requests.read', 'login_requests.reject')
  @ApiOperation({ summary: 'Reject a login request' })
  async reject(@Param('id') id: string) {
    return this._rejectLoginRequestUseCase.execute(id);
  }
}
