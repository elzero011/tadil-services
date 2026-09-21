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
import {
  CreateInformationUseCase,
  UpdateInformationUseCase,
  DeleteInformationUseCase,
} from '@tadil-informations';
import { DataReader } from '@tadil-database';
import {
  CreateInformationDTO,
  DisplayInformationDTO,
  InformationType,
  UpdateInformationDTO,
} from './dtos';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('informations')
@ApiTags('Informations')
export class InformationsController {
  constructor(
    private readonly _dataReader: DataReader,
    private readonly _createInformationUseCase: CreateInformationUseCase,
    private readonly _updateInformationUseCase: UpdateInformationUseCase,
    private readonly _deleteInformationUseCase: DeleteInformationUseCase
  ) {}

  @Get('/')
  @RequirePermissions('informations.read')
  @ApiOkResponse({ type: DisplayInformationDTO, isArray: true })
  async getInformations(): Promise<DisplayInformationDTO[]> {
    const informations = await this._dataReader.queries.information.findMany({
      include: {
        extras: { select: { id: true } },
      },
      orderBy: { sorting: 'asc' },
    });
    return informations.map((information) => ({
      id: information.id,
      englishName: information.englishName,
      arabicName: information.arabicName,
      hindiName: information.hindiName,
      urduName: information.urduName,
      bengaliName: information.bengaliName,
      isRequired: information.isRequired,
      type: information.type as InformationType,
      unit: information.unit ?? undefined,
      extras: information.extras.map((extra) => extra.id),
      sorting: information.sorting,
    }));
  }

  @Get('/:id')
  @RequirePermissions('informations.read')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ type: DisplayInformationDTO })
  async getInformationById(
    @Param('id') id: string
  ): Promise<DisplayInformationDTO> {
    const information = await this._dataReader.queries.information.findUnique({
      where: { id },
      include: {
        extras: { select: { id: true } },
      },
    });

    if (!information)
      throw new NotFoundException(`Information with id ${id} not found`);
    return {
      id: information.id,
      englishName: information.englishName,
      arabicName: information.arabicName,
      hindiName: information.hindiName,
      urduName: information.urduName,
      bengaliName: information.bengaliName,
      isRequired: information.isRequired,
      type: information.type as InformationType,
      unit: information.unit ?? undefined,
      extras: information.extras.map((extra) => extra.id),
      sorting: information.sorting,
    };
  }

  @Post('/create')
  @RequirePermissions('informations.read', 'informations.create')
  async createInformation(
    @Body() information: CreateInformationDTO
  ): Promise<void> {
    await this._createInformationUseCase.execute(information);
  }

  @Put(':id/update')
  @RequirePermissions('informations.read', 'informations.update')
  @ApiParam({ name: 'id', type: 'string' })
  async updateInformation(
    @Param('id') id: string,
    @Body() information: UpdateInformationDTO
  ): Promise<void> {
    await this._updateInformationUseCase.execute({ ...information, id });
  }

  @Delete('/delete/:id')
  @RequirePermissions('informations.read', 'informations.delete')
  @ApiParam({ name: 'id', type: 'string' })
  async deleteInformation(@Param('id') id: string): Promise<void> {
    await this._deleteInformationUseCase.execute({ informationId: id });
  }
}
