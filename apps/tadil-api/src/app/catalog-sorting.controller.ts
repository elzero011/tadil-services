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
import type { Prisma } from '@prisma/client';
import { UpdateSortingDTO } from './users/dtos';
import { AuthenticatedRoute } from './auth/decorators/authenticated.decorator';

@Controller('catalog')
@ApiTags('Catalog')
export class CatalogSortingController {
  constructor(private readonly _dataReader: DataReader) {}

  @Patch('/:entity/:id/sorting')
  @AuthenticatedRoute()
  @ApiParam({ name: 'entity', enum: ['alterations', 'informations', 'extras'] })
  async updateSorting(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Body() body: UpdateSortingDTO,
    @Req() req: { staff?: { permissions?: string[] } }
  ): Promise<void> {
    const permissions = req.staff?.permissions ?? [];
    const required = [`${entity}.read`, `${entity}.update`];
    if (!['alterations', 'informations', 'extras'].includes(entity) ||
        !required.every((permission) => permissions.includes(permission))) {
      throw new ForbiddenException();
    }
    switch (entity) {
      case 'alterations':
        return this.moveAlteration(id, Number(body.sorting));
      case 'informations':
        return this.moveInformation(id, Number(body.sorting));
      case 'extras':
        return this.moveExtra(id, Number(body.sorting));
      default:
        throw new BadRequestException('Unsupported catalog entity');
    }
  }

  private async moveAlteration(id: string, position: number): Promise<void> {
    const rows = await this._dataReader.queries.alteration.findMany({
      orderBy: [{ sorting: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    await this.persistPosition(rows, id, position, (rowId, sorting) =>
      this._dataReader.queries.alteration.update({
        where: { id: rowId },
        data: { sorting },
      })
    );
  }

  private async moveInformation(id: string, position: number): Promise<void> {
    const rows = await this._dataReader.queries.information.findMany({
      orderBy: [{ sorting: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    await this.persistPosition(rows, id, position, (rowId, sorting) =>
      this._dataReader.queries.information.update({
        where: { id: rowId },
        data: { sorting },
      })
    );
  }

  private async moveExtra(id: string, position: number): Promise<void> {
    const rows = await this._dataReader.queries.extra.findMany({
      orderBy: [{ sorting: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });
    await this.persistPosition(rows, id, position, (rowId, sorting) =>
      this._dataReader.queries.extra.update({
        where: { id: rowId },
        data: { sorting },
      })
    );
  }

  private async persistPosition(
    rows: { id: string }[],
    id: string,
    position: number,
    update: (id: string, sorting: number) => Prisma.PrismaPromise<unknown>
  ): Promise<void> {
    if (!Number.isInteger(position) || position < 1 || position > rows.length) {
      throw new BadRequestException(`Sorting must be between 1 and ${rows.length}`);
    }
    const currentIndex = rows.findIndex((row) => row.id === id);
    if (currentIndex === -1) throw new NotFoundException('Item not found');
    const [row] = rows.splice(currentIndex, 1);
    rows.splice(position - 1, 0, row!);
    // ponytail: O(n) writes keep positions contiguous; use range updates if catalogs become large.
    await this._dataReader.queries.$transaction(
      rows.map((item, index) => update(item.id, index + 1))
    );
  }
}
