import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AlipayService } from './alipay.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, AlipayService],
  exports: [BillingService],
})
export class BillingModule {}
