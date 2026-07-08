import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthModule } from './health/health.module';
import { PharmaciesModule } from './pharmacies/pharmacies.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { AiModule } from './ai/ai.module';
import { PaymentsModule } from './payments/payments.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { SpecialistsModule } from './specialists/specialists.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    PharmaciesModule,
    ProductsModule,
    OrdersModule,
    InventoryModule,
    AiModule,
    PaymentsModule,
    PrescriptionsModule,
    AdminModule,
    UsersModule,
    SpecialistsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
