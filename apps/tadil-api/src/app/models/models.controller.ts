import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  AddModelImageUseCase,
  AddSectionUseCase,
  CreateModelUseCase,
  UpdateModelUseCase,
  UpdateSectionUseCase,
  DeleteModelImageUseCase,
  DeleteModelUseCase,
  DeleteSectionUseCase,
  ReorderSectionsUseCase,
} from '@tadil-models';
import {
  AddModelImageDTO,
  AddSectionDTO,
  UpdateSectionDTO,
  ReorderSectionsDTO,
  CreateModelDTO,
  DisplayModelDTO,
  DisplayModelImageDTO,
  DisplaySectionDTO,
  UpdateModelDTO,
} from './dtos';
import { FilesInterceptor } from '@nestjs/platform-express';
import { type FileStorageService, ReadableFile } from '@tadil-common';
import {
  cleanupLocalFile,
  fileUploadLocalPath,
  streamToBase64,
} from '../utils';
import { DataReader } from '@tadil-database';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('models')
@ApiTags('Models')
export class ModelsController {
  constructor(
    private readonly _dataReader: DataReader,
    private readonly _createModelUseCase: CreateModelUseCase,
    private readonly _updateModelUseCase: UpdateModelUseCase,
    private readonly _deleteModelUseCase: DeleteModelUseCase,
    private readonly _addModelImageUseCase: AddModelImageUseCase,
    private readonly _deleteModelImageUseCase: DeleteModelImageUseCase,
    private readonly _addSectionUseCase: AddSectionUseCase,
    private readonly _updateSectionUseCase: UpdateSectionUseCase,
    private readonly _deleteSectionUseCase: DeleteSectionUseCase,
    private readonly _reorderSectionsUseCase: ReorderSectionsUseCase,
    @Inject('FileStorageService')
    private readonly _fileStorageService: FileStorageService
  ) {}

  @Get('/')
  @RequirePermissions('models.read')
  @ApiOkResponse({ type: DisplayModelDTO, isArray: true })
  async getModels(): Promise<DisplayModelDTO[]> {
    const models = await this._dataReader.queries.model.findMany({
      include: { images: { select: { fileId: true } } },
    });
    const modelsWithThumbNails = await Promise.all(
      models.map(async (model) => {
        let thumbNailImageBase64String: string | undefined;
        if (model.images.length > 0) {
          const thumbNailImage = model.images[0];
          const thumbNailImageStream =
            await this._fileStorageService.downloadFile(thumbNailImage.fileId);
          thumbNailImageBase64String = await streamToBase64(
            thumbNailImageStream
          );
        }
        return {
          id: model.id,
          englishName: model.englishName,
          arabicName: model.arabicName,
          hindiName: model.hindiName,
          urduName: model.urduName,
          bengaliName: model.bengaliName,
          category: model.category ?? undefined,
          thumbNailImageBase64String,
        };
      })
    );
    return modelsWithThumbNails;
  }

  @Post('/create')
  @RequirePermissions('models.read', 'models.create')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', undefined, fileUploadLocalPath))
  async createModel(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() model: CreateModelDTO
  ): Promise<void> {
    try {
      const newModelId = await this._createModelUseCase.execute(model);
      await Promise.all(
        files.map(async (file) => {
          const imageFile: ReadableFile = {
            path: file.path,
            mimetype: file.mimetype,
            originalName: file.originalname,
            size: file.size,
          };
          await this._addModelImageUseCase.execute({
            modelId: newModelId,
            imageFile,
          });
        })
      );
    } finally {
      files.forEach((file) => {
        cleanupLocalFile(file.path);
      });
    }
  }

  @Post('/images/:id/sections/add')
  @RequirePermissions('models.read', 'models.update')
  @ApiParam({ name: 'id', type: 'string' })
  async addSection(
    @Param('id') id: string,
    @Body() section: AddSectionDTO
  ): Promise<void> {
    await this._addSectionUseCase.execute({
      ...section,
      modelImageId: id,
    });
  }

  @Patch('/images/sections/:id/update')
  @RequirePermissions('models.read', 'models.update')
  @ApiParam({ name: 'id', type: 'string' })
  async updateSection(
    @Param('id') id: string,
    @Body() section: UpdateSectionDTO
  ): Promise<void> {
    await this._updateSectionUseCase.execute({
      ...section,
      id,
    });
  }

  @Delete('/images/:id/delete')
  @RequirePermissions('models.read', 'models.update')
  @ApiParam({ name: 'id', type: 'string' })
  async deleteModelImage(@Param('id') id: string): Promise<void> {
    await this._deleteModelImageUseCase.execute({ imageId: id });
  }

  @Get('/images/sections')
  @RequirePermissions('models.read')
  @ApiOkResponse({ type: DisplaySectionDTO, isArray: true })
  async getSections(): Promise<DisplaySectionDTO[]> {
    const sections = await this._dataReader.queries.section.findMany({
      include: { services: { select: { id: true } } },
      orderBy: { sorting: 'asc' },
    });
    return sections.map((section) => ({
      ...section,
      coordinates: section.coordinates as unknown as { x: number; y: number }[],
      alterations: section.services.map((service) => service.id),
    }));
  }

  @Patch('/images/:id/sections/reorder')
  @RequirePermissions('models.read', 'models.update')
  @ApiParam({ name: 'id', type: 'string' })
  async reorderSections(
    @Param('id') id: string,
    @Body() body: ReorderSectionsDTO
  ): Promise<void> {
    await this._reorderSectionsUseCase.execute({
      modelImageId: id,
      sectionIds: body.sectionIds,
    });
  }

  @Delete('/images/sections/:id/delete')
  @RequirePermissions('models.read', 'models.update')
  @ApiParam({ name: 'id', type: 'string' })
  async deleteSection(@Param('id') id: string): Promise<void> {
    await this._deleteSectionUseCase.execute({ sectionId: id });
  }

  @Get('/:id/images')
  @RequirePermissions('models.read')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ type: DisplayModelImageDTO, isArray: true })
  async getModelImages(
    @Param('id') id: string
  ): Promise<DisplayModelImageDTO[]> {
    const modelImages = await this._dataReader.queries.modelImage.findMany({
      where: { modelId: id },
      include: {
        sections: {
          include: {
            services: { select: { id: true } },
          },
          orderBy: { sorting: 'asc' },
        },
      },
    });

    const images = await Promise.all(
      modelImages.map(async (image) => {
        const imageStream = await this._fileStorageService.downloadFile(
          image.fileId
        );
        const imageBase64String = await streamToBase64(imageStream);
        return {
          id: image.id,
          fileId: image.fileId,
          imageBase64String,
          sections: image.sections.map((section) => ({
            id: section.id,
            englishName: section.englishName,
            arabicName: section.arabicName,
            hindiName: section.hindiName,
            urduName: section.urduName,
            bengaliName: section.bengaliName,
            coordinates: section.coordinates as unknown as {
              x: number;
              y: number;
            }[],
            alterations: section.services.map((service) => service.id),
            sorting: section.sorting,
          })),
        };
      })
    );
    return images;
  }

  @Post('/:id/images/add')
  @RequirePermissions('models.read', 'models.update')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AddModelImageDTO })
  @UseInterceptors(FilesInterceptor('files', undefined, fileUploadLocalPath))
  async addModelImage(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[]
  ): Promise<void> {
    try {
      await Promise.all(
        files.map(async (file) => {
          const imageFile: ReadableFile = {
            path: file.path,
            mimetype: file.mimetype,
            originalName: file.originalname,
            size: file.size,
          };
          await this._addModelImageUseCase.execute({
            modelId: id,
            imageFile,
          });
        })
      );
    } finally {
      files.forEach((file) => {
        cleanupLocalFile(file.path);
      });
    }
  }

  @Patch('/:id/update')
  @RequirePermissions('models.read', 'models.update')
  @ApiParam({ name: 'id', type: 'string' })
  async updateModel(
    @Param('id') id: string,
    @Body() model: UpdateModelDTO
  ): Promise<void> {
    await this._updateModelUseCase.execute({ ...model, id });
  }

  @Delete('/:id/delete')
  @RequirePermissions('models.read', 'models.delete')
  @ApiParam({ name: 'id', type: 'string' })
  async deleteModel(@Param('id') id: string): Promise<void> {
    await this._deleteModelUseCase.execute({ modelId: id });
  }
}
