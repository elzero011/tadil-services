import { ForbiddenException } from '@nestjs/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DataReader } from '@tadil-database';
import { CreateUserDTO, DisplayUserDTO, PaginatedUsersDTO, UpdateUserDTO } from '../dtos';
import {
  ROLE,
  CreateUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
} from '@tadil-users';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('tailors')
@ApiTags('Tailors')
export class TailorsController {
  constructor(
    private readonly _dataReader: DataReader,
    private readonly _createUserUseCase: CreateUserUseCase,
    private readonly _updateUserUseCase: UpdateUserUseCase,
    private readonly _deleteUserUseCase: DeleteUserUseCase
  ) {}

  @Get('/')
  @RequirePermissions('tailors.read')
  @ApiOkResponse({ type: PaginatedUsersDTO })
  @ApiQuery({ name: 'search', required: false, description: 'Matches first name, last name or phone' })
  @ApiQuery({ name: 'page', required: false, description: '1-based page number' })
  @ApiQuery({ name: 'pageSize', required: false })
  async getTailors(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<PaginatedUsersDTO> {
    const pageNumber = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize ?? '20', 10) || 20));

    const term = search?.trim();
    const where = {
      role: ROLE.TAILOR,
      ...(term
        ? {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' as const } },
              { lastName: { contains: term, mode: 'insensitive' as const } },
              { phone: { contains: term, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, users, sortingMax] = await Promise.all([
      this._dataReader.queries.user.count({ where }),
      this._dataReader.queries.user.findMany({
        where,
        include: { addresses: true },
        orderBy: [{ sorting: 'asc' }, { firstName: 'asc' }],
        skip: (pageNumber - 1) * size,
        take: size,
      }),
      this._dataReader.queries.user.count({ where: { role: ROLE.TAILOR } }),
    ]);

    const data = users.map((user) => {
      const { loginToken, loginRequestStatus, walletBalance, ...safeUser } = user;
      return ({
      ...safeUser,
      email: user.email ?? undefined,
      cityNameAr: user.addresses.length > 0 ? user.addresses[0].cityNameAr : undefined,
      cityNameEn: user.addresses.length > 0 ? user.addresses[0].cityNameEn : undefined,
      cityNameBn: user.addresses.length > 0 ? user.addresses[0].cityNameBn : undefined,
      cityNameHi: user.addresses.length > 0 ? user.addresses[0].cityNameHi : undefined,
      cityNameUr: user.addresses.length > 0 ? user.addresses[0].cityNameUr : undefined,
      cityId: user.addresses.length > 0 ? user.addresses[0].cityId ?? undefined : undefined,
      districtId: user.addresses.length > 0 ? user.addresses[0].districtId ?? undefined : undefined,
      districtNameAr: user.addresses.length > 0 ? user.addresses[0].districtNameAr ?? undefined : undefined,
      districtNameEn: user.addresses.length > 0 ? user.addresses[0].districtNameEn ?? undefined : undefined,
      districtNameBn: user.addresses.length > 0 ? user.addresses[0].districtNameBn ?? undefined : undefined,
      districtNameHi: user.addresses.length > 0 ? user.addresses[0].districtNameHi ?? undefined : undefined,
      districtNameUr: user.addresses.length > 0 ? user.addresses[0].districtNameUr ?? undefined : undefined,
      street: user.addresses.length > 0 ? user.addresses[0].street ?? undefined : undefined,
      streetAr: user.addresses.length > 0 ? user.addresses[0].streetAr ?? undefined : undefined,
      streetEn: user.addresses.length > 0 ? user.addresses[0].streetEn ?? undefined : undefined,
      streetBn: user.addresses.length > 0 ? user.addresses[0].streetBn ?? undefined : undefined,
      streetHi: user.addresses.length > 0 ? user.addresses[0].streetHi ?? undefined : undefined,
      streetUr: user.addresses.length > 0 ? user.addresses[0].streetUr ?? undefined : undefined,
      latitude: user.addresses.length > 0 ? user.addresses[0].latitude ?? undefined : undefined,
      longitude: user.addresses.length > 0 ? user.addresses[0].longitude ?? undefined : undefined,
      });
    });

    return { data, total, page: pageNumber, pageSize: size, sortingMax };
  }

  @Get('/phone/:phone')
  @RequirePermissions('tailors.read')
  @ApiOkResponse({ type: DisplayUserDTO })
  async getTailorByPhone(
    @Param('phone') phone: string
  ): Promise<DisplayUserDTO | undefined> {
    const user = await this._dataReader.queries.user.findUnique({
      where: { phone },
    });

    if (!user) return undefined;
    if (user.role !== ROLE.TAILOR) return undefined;
    const { loginToken, loginRequestStatus, walletBalance, ...safeUser } = user;
    return {
      ...safeUser,
      email: user.email ?? undefined,
    };
  }

  @Post('/create')
  @RequirePermissions('tailors.read', 'tailors.create')
  async createTailor(@Body() tailor: CreateUserDTO): Promise<void> {
    await this._createUserUseCase.execute({
      ...tailor,
      role: ROLE.TAILOR,
    });
  }

  @Get('/:id')
  @RequirePermissions('tailors.read')
  @ApiOkResponse({ type: DisplayUserDTO })
  async getTailorById(
    @Param('id') id: string
  ): Promise<DisplayUserDTO | undefined> {
    const user = await this._dataReader.queries.user.findUnique({
      where: { id },
    });

    if (!user) return undefined;
    if (user.role !== ROLE.TAILOR) return undefined;
    const { loginToken, loginRequestStatus, walletBalance, ...safeUser } = user;
    return {
      ...safeUser,
      email: user.email ?? undefined,
    };
  }

  @Put('/:id/update')
  @RequirePermissions('tailors.read', 'tailors.update')
  async updateTailor(
    @Param('id') id: string,
    @Body() tailor: UpdateUserDTO
  ): Promise<void> {
    await this.assertTailor(id);
    await this._updateUserUseCase.execute({
      ...tailor,
      id: id,
    });
  }

  @Delete('/:id/delete')
  @RequirePermissions('tailors.read', 'tailors.delete')
  async deleteTailor(@Param('id') id: string): Promise<void> {
    await this.assertTailor(id);
    await this._deleteUserUseCase.execute({ id });
  }

  private async assertTailor(id: string): Promise<void> {
    const user = await this._dataReader.queries.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user || user.role !== ROLE.TAILOR) throw new ForbiddenException();
  }
}
