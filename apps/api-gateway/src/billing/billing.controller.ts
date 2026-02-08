import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { CreateOrderDto, MockPayDto } from './dto';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('plans')
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('balance')
  getBalance(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.billingService.getBalance(userId);
  }

  @Post('order')
  createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const userId = (req.user as { id: string }).id;
    return this.billingService.createOrder(userId, dto.planId);
  }

  @Post('mock/pay')
  mockPay(@Req() req: Request, @Body() dto: MockPayDto) {
    const userId = (req.user as { id: string }).id;
    return this.billingService.mockPay(dto.orderId, userId);
  }
}
