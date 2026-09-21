import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { DataReader } from '@tadil-database';
import {
  CreateAlterationUseCase,
  UpdateAlterationUseCase,
  DeleteAlterationUseCase,
} from '@tadil-alterations';
import {
  CreateAlterationDTO,
  DisplayAlterationDTO,
  UpdateAlterationDTO,
} from './dtos';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('alterations')
@ApiTags('Alterations')
export class AlterationsController {
  constructor(
    private readonly _createAlterationUseCase: CreateAlterationUseCase,
    private readonly _updateAlterationUseCase: UpdateAlterationUseCase,
    private readonly _deleteAlterationUseCase: DeleteAlterationUseCase,
    private readonly _dataReader: DataReader
  ) {}

  @Get('/')
  @RequirePermissions('alterations.read')
  @ApiOkResponse({ type: DisplayAlterationDTO, isArray: true })
  async getAlterations(): Promise<DisplayAlterationDTO[]> {
    const alterations = await this._dataReader.queries.alteration.findMany({
      include: {
        sections: { select: { id: true } },
        informations: { select: { id: true } },
      },
      orderBy: { sorting: 'asc' },
    });
    return alterations.map((alteration) => ({
      ...alteration,
      sections: alteration.sections.map((section) => section.id),
      informations: alteration.informations.map(
        (informations) => informations.id
      ),
    }));
  }

  @Get('/:id')
  @RequirePermissions('alterations.read')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ type: DisplayAlterationDTO })
  async getAlterationById(
    @Param('id') id: string
  ): Promise<DisplayAlterationDTO> {
    const alteration = await this._dataReader.queries.alteration.findUnique({
      where: { id },
      include: {
        sections: { select: { id: true } },
        informations: { select: { id: true } },
      },
    });

    if (!alteration)
      throw new NotFoundException(`Alteration with id ${id} not found`);
    return {
      ...alteration,
      sections: alteration.sections.map((section) => section.id),
      informations: alteration.informations.map(
        (informations) => informations.id
      ),
    };
  }

  @Post('/create')
  @RequirePermissions('alterations.read', 'alterations.create')
  async createAlteration(
    @Body() alteration: CreateAlterationDTO
  ): Promise<void> {
    await this._createAlterationUseCase.execute(alteration);
  }

  @Put('/update/:id')
  @RequirePermissions('alterations.read', 'alterations.update')
  @ApiParam({ name: 'id', type: 'string' })
  async updateAlteration(
    @Param('id') id: string,
    @Body() alteration: UpdateAlterationDTO
  ): Promise<void> {
    await this._updateAlterationUseCase.execute({ ...alteration, id });
  }

  @Delete('/delete/:id')
  @RequirePermissions('alterations.read', 'alterations.delete')
  @ApiParam({ name: 'id', type: 'string' })
  async deleteAlteration(@Param('id') id: string): Promise<void> {
    await this._deleteAlterationUseCase.execute({ alterationId: id });
  }
}
