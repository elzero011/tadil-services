import { Controller, Get, Post, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DataReader } from '@tadil-database';
import { AssignTailorManuallyUseCase } from '@tadil-orders';
import { PaginatedOrdersDto } from './dtos/paginatedOrders.dto';
import { DisplayOrderDetailsDto, DisplayExtraSnapshotDTO } from './dtos/displayOrderDetails.dto';
import { environment } from '../../environments/environment';
import { ChatMessage } from '@tadil-chat';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('orders')
@ApiTags('Orders')
export class OrdersController {
  constructor(
    private readonly _dataReader: DataReader,
    private readonly _assignTailorUseCase: AssignTailorManuallyUseCase
  ) {}

  @Get('/')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'Get all orders with optional filtering' })
  @ApiOkResponse({ type: PaginatedOrdersDto })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'tailorId', required: false })
  @ApiQuery({ name: 'courierId', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'ISO date, inclusive lower bound' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'ISO date, inclusive upper bound' })
  @ApiQuery({ name: 'page', required: false, description: '1-based page number' })
  @ApiQuery({ name: 'pageSize', required: false })
  async getOrders(
    @Query('status') status?: string,
    @Query('tailorId') tailorId?: string,
    @Query('courierId') courierId?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<PaginatedOrdersDto> {
    const pageNumber = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize ?? '20', 10) || 20));

    // dateTo is treated as inclusive: extend it to the end of that day so the
    // whole calendar day is covered regardless of the time component sent.
    let dateToBound: Date | undefined;
    if (dateTo) {
      const parsed = new Date(dateTo);
      if (!isNaN(parsed.getTime())) {
        parsed.setUTCHours(23, 59, 59, 999);
        dateToBound = parsed;
      }
    }
    const dateFromBound = dateFrom ? new Date(dateFrom) : undefined;

    const where = {
      AND: [
        status ? { status: status as any } : {},
        tailorId ? { assignedTailorId: tailorId } : {},
        courierId ? {
          OR: [
            { assignedCourierId: courierId },
            { assignedReturnCourierId: courierId }
          ]
        } : {},
        customerId ? { customerId } : {},
        dateFromBound && !isNaN(dateFromBound.getTime()) ? { date: { gte: dateFromBound } } : {},
        dateToBound ? { date: { lte: dateToBound } } : {},
      ]
    };

    const [total, orders] = await Promise.all([
      this._dataReader.queries.order.count({ where }),
      this._dataReader.queries.order.findMany({
        where,
        include: {
          customer: true,
          assignedTailor: true,
          assignedCourier: true,
          assignedReturnCourier: true,
          address: true,
          history: { orderBy: { timestamp: 'desc' } },
        },
        orderBy: { date: 'desc' },
        skip: (pageNumber - 1) * size,
        take: size,
      }),
    ]);

    const data = orders.map((order) => ({
      id: order.id,
      reference: order.reference,
      date: order.date.toISOString(),
      totalPrice: order.totalPrice,
      status: order.status,
      customerId: order.customerId,
      assignedTailorId: order.assignedTailorId ?? undefined,
      assignedCourierId: order.assignedCourierId ?? undefined,
      assignedReturnCourierId: order.assignedReturnCourierId ?? undefined,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      tailorName: order.assignedTailor ? `${order.assignedTailor.firstName} ${order.assignedTailor.lastName}` : undefined,
      courierName: order.assignedCourier ? `${order.assignedCourier.firstName} ${order.assignedCourier.lastName}` : 
                  (order.assignedReturnCourier ? `${order.assignedReturnCourier.firstName} ${order.assignedReturnCourier.lastName}` : undefined),
      cityNameAr: order.address?.cityNameAr ?? undefined,
      cityNameEn: order.address?.cityNameEn ?? undefined,
      cityNameBn: order.address?.cityNameBn ?? undefined,
      cityNameHi: order.address?.cityNameHi ?? undefined,
      cityNameUr: order.address?.cityNameUr ?? undefined,
      districtNameAr: order.address?.districtNameAr ?? undefined,
      districtNameEn: order.address?.districtNameEn ?? undefined,
      districtNameBn: order.address?.districtNameBn ?? undefined,
      districtNameHi: order.address?.districtNameHi ?? undefined,
      districtNameUr: order.address?.districtNameUr ?? undefined,
      history: order.history.map(h => ({ status: h.status, timestamp: h.timestamp.toISOString() })),
    }));

    return { data, total, page: pageNumber, pageSize: size };
  }

  @Get('/:id')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'Get detailed order by id' })
  @ApiOkResponse({ type: DisplayOrderDetailsDto })
  async getOrderById(@Param('id') id: string): Promise<DisplayOrderDetailsDto> {
    const order = await this._dataReader.queries.order.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTailor: true,
        assignedCourier: true,
        assignedReturnCourier: true,
        address: true,
        history: { orderBy: { timestamp: 'desc' } },
        items: {
          include: {
            sections: {
              include: {
                alterations: {
                  include: { informations: true }
                }
              }
            }
          }
        },
        customItems: {
          include: {
            alterations: {
              include: { informations: true }
            }
          }
        },
        chats: true
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    const baseUrl = process.env.TADIL_API || `http://localhost:${environment.apiPort}`;

    return {
      id: order.id,
      reference: order.reference,
      date: order.date.toISOString(),
      totalPrice: order.totalPrice,
      status: order.status,
      customerId: order.customerId,
      assignedTailorId: order.assignedTailorId ?? undefined,
      assignedCourierId: order.assignedCourierId ?? undefined,
      assignedReturnCourierId: order.assignedReturnCourierId ?? undefined,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      tailorName: order.assignedTailor ? `${order.assignedTailor.firstName} ${order.assignedTailor.lastName}` : undefined,
      courierName: order.assignedCourier ? `${order.assignedCourier.firstName} ${order.assignedCourier.lastName}` : 
                  (order.assignedReturnCourier ? `${order.assignedReturnCourier.firstName} ${order.assignedReturnCourier.lastName}` : undefined),
      cityNameAr: order.address?.cityNameAr ?? undefined,
      cityNameEn: order.address?.cityNameEn ?? undefined,
      cityNameBn: order.address?.cityNameBn ?? undefined,
      cityNameHi: order.address?.cityNameHi ?? undefined,
      cityNameUr: order.address?.cityNameUr ?? undefined,
      districtNameAr: order.address?.districtNameAr ?? undefined,
      districtNameEn: order.address?.districtNameEn ?? undefined,
      districtNameBn: order.address?.districtNameBn ?? undefined,
      districtNameHi: order.address?.districtNameHi ?? undefined,
      districtNameUr: order.address?.districtNameUr ?? undefined,
      history: order.history.map(h => ({ status: h.status, timestamp: h.timestamp.toISOString() })),
      items: order.items.map(item => ({
        id: item.id,
        englishName: item.englishName,
        arabicName: item.arabicName,
        urduName: item.urduName,
        hindiName: item.hindiName,
        bengaliName: item.bengaliName,
        price: item.price,
        imageFileUrl: `${baseUrl}/api/files/${item.imageFileId}`,
        sections: item.sections.map(section => ({
          id: section.id,
          englishName: section.englishName,
          arabicName: section.arabicName,
          urduName: section.urduName,
          hindiName: section.hindiName,
          bengaliName: section.bengaliName,
          coordinates: section.coordinates,
          alterations: section.alterations.map(alt => ({
            id: alt.id,
            englishName: alt.englishName,
            arabicName: alt.arabicName,
            urduName: alt.urduName,
            hindiName: alt.hindiName,
            bengaliName: alt.bengaliName,
            price: alt.price,
            customCoordinates: alt.customCoordinates,
            informations: alt.informations.map(info => ({
              id: info.id,
              englishName: info.englishName,
              arabicName: info.arabicName,
              urduName: info.urduName,
              hindiName: info.hindiName,
              bengaliName: info.bengaliName,
              type: info.type,
              unit: info.unit ?? undefined,
              value: info.value,
              extraDetails: info.extraDetails as DisplayExtraSnapshotDTO,
            }))
          }))
        }))
      })),
      customItems: order.customItems.map(item => ({
        id: item.id,
        price: item.price,
        imageFileUrl: `${baseUrl}/api/files/${item.imageFileId}`,
        alterations: item.alterations.map(alt => ({
          id: alt.id,
          englishName: alt.englishName,
          arabicName: alt.arabicName,
          urduName: alt.urduName,
          hindiName: alt.hindiName,
          bengaliName: alt.bengaliName,
          price: alt.price,
          customCoordinates: alt.customCoordinates,
          informations: alt.informations.map(info => ({
            id: info.id,
            englishName: info.englishName,
            arabicName: info.arabicName,
            urduName: info.urduName,
            hindiName: info.hindiName,
            bengaliName: info.bengaliName,
            type: info.type,
            unit: info.unit ?? undefined,
            value: info.value,
            extraDetails: info.extraDetails as DisplayExtraSnapshotDTO,
          }))
        }))
      })),
      chats: order.chats.map(chat => ({
        id: chat.id,
        channel: chat.channel,
        updatedAt: chat.updatedAt.toISOString(),
        messages: (chat.content as ChatMessage[]).map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          type: msg.type,
          content: msg.type !== 'TEXT' ? `${baseUrl}/api/files/${msg.content}` : msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata,
          deletedAt: msg.deletedAt,
          isEdited: msg.isEdited,
        }))
      }))
    };
  }

  @Post('/:id/assign-tailor')
  @RequirePermissions('orders.read', 'orders.assign_tailor')
  @ApiOperation({ summary: 'Manually assign a tailor to an order' })
  async assignTailor(
    @Param('id') id: string,
    @Body('tailorId') tailorId: string
  ): Promise<void> {
    await this._assignTailorUseCase.execute({
      orderId: id,
      tailorId,
    });
  }
}
