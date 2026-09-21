import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ModelsModule } from './models/models.module';
import { InformationsModule } from './informations/informations.module';
import { AlterationsModule } from './alterations/alterations.module';
import { ExtrasModule } from './extras/extras.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { LocationsModule } from './locations/locations.module';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { SessionGuard } from './auth/guards/session.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { CatalogSortingController } from './catalog-sorting.controller';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    ModelsModule,
    InformationsModule,
    AlterationsModule,
    ExtrasModule,
    UsersModule,
    OrdersModule,
    LocationsModule,
  ],
  controllers: [AppController, CatalogSortingController],
  providers: [
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
