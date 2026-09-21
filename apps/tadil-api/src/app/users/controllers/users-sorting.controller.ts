import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { DataReader } from '@tadil-database';
import { ROLE } from '@tadil-users';
import { UpdateSortingDTO } from '../dtos';
import { AuthenticatedRoute } from '../../auth/decorators/authenticated.decorator';

@Controller('users')
@ApiTags('Users')
export class UsersSortingController {
  constructor(private readonly _dataReader: DataReader) {}

  @Patch('/:id/sorting')
  // The target role is checked below; customers have no sorting mutation permission.
  @AuthenticatedRoute()
  @ApiParam({ name: 'id', type: 'string' })
  async updateSorting(
    @Param('id') id: string,
    @Body() body: UpdateSortingDTO,
    @Req() req: { staff?: { permissions?: string[] } }
  ): Promise<void> {
    const user = await this._dataReader.queries.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== ROLE.TAILOR && user.role !== ROLE.COURIER) {
      throw new BadRequestException('Only tailors and couriers can be sorted');
    }
    const resource = user.role === ROLE.TAILOR ? 'tailors' : 'couriers';
    const permissions = req.staff?.permissions ?? [];
    if (![`${resource}.read`, `${resource}.update`].every((permission) => permissions.includes(permission))) {
      throw new ForbiddenException();
    }

    const users = await this._dataReader.queries.user.findMany({
      where: { role: user.role },
      orderBy: [{ sorting: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    const position = Number(body.sorting);
    if (!Number.isInteger(position) || position < 1 || position > users.length) {
      throw new BadRequestException(
        `Sorting must be between 1 and ${users.length}`
      );
    }

    const currentIndex = users.findIndex((item) => item.id === id);
    const [moved] = users.splice(currentIndex, 1);
    users.splice(position - 1, 0, moved!);
    // ponytail: O(n) writes keep role-scoped positions contiguous; use range updates if user lists become large.
    await this._dataReader.queries.$transaction(
      users.map((item, index) =>
        this._dataReader.queries.user.update({
          where: { id: item.id },
          data: { sorting: index + 1 },
        })
      )
    );
  }
}
