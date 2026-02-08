import { Controller, Get, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { CreateOrderDto, MockPayDto } from './dto';

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@Req() req: Request) {
    const userId = (req.user as { id: string }).id;
    return this.billingService.getBalance(userId);
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const userId = (req.user as { id: string }).id;
    return this.billingService.createOrder(userId, dto.planId);
  }

  @Post('mock/pay')
  @UseGuards(JwtAuthGuard)
  mockPay(@Req() req: Request, @Body() dto: MockPayDto) {
    const userId = (req.user as { id: string }).id;
    return this.billingService.mockPay(dto.orderId, userId);
  }

  @Post('alipay/notify')
  async alipayNotify(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.billingService.handleAlipayNotify(body);
    res.set('Content-Type', 'text/plain');
    res.send(result);
  }
}
