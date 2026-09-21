import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DataReader } from '@tadil-database';
import { DisplayUserDTO, PaginatedUsersDTO } from '../dtos';
import { ROLE } from '@tadil-users';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Controller('customers')
@ApiTags('Customers')
export class CustomersController {
  constructor(private readonly _dataReader: DataReader) {}

  @Get('/')
  @RequirePermissions('customers.read')
  @ApiOkResponse({ type: PaginatedUsersDTO })
  @ApiQuery({ name: 'search', required: false, description: 'Matches first name, last name or phone' })
  @ApiQuery({ name: 'page', required: false, description: '1-based page number' })
  @ApiQuery({ name: 'pageSize', required: false })
  async getCustomers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<PaginatedUsersDTO> {
    const pageNumber = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize ?? '20', 10) || 20));

    const term = search?.trim();
    const where = {
      role: ROLE.CUSTOMER,
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
      this._dataReader.queries.user.count({ where: { role: ROLE.CUSTOMER } }),
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

  @Get('/:id')
  @RequirePermissions('customers.read')
  @ApiOkResponse({ type: DisplayUserDTO })
  async getCustomerById(
    @Param('id') id: string
  ): Promise<DisplayUserDTO | undefined> {
    const user = await this._dataReader.queries.user.findUnique({
      where: { id },
    });

    if (!user) return undefined;
    const { loginToken, loginRequestStatus, walletBalance, ...safeUser } = user;
    return {
      ...safeUser,
      email: user.email ?? undefined,
    };
  }
}
