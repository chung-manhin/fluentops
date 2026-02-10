import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { CreateOrderDto, MockPayDto } from './dto';
import { AuthenticatedRequest } from '../common/authenticated-request';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private billingService: BillingService,
    private configService: ConfigService,
  ) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@Req() req: AuthenticatedRequest) {
    return this.billingService.getBalance(req.user.id);
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createOrder(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.billingService.createOrder(req.user.id, dto.planId);
  }

  @Post('mock/pay')
  @UseGuards(JwtAuthGuard)
  mockPay(@Req() req: AuthenticatedRequest, @Body() dto: MockPayDto) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    return this.billingService.mockPay(dto.orderId, req.user.id);
  }

  @Post('alipay/notify')
  async alipayNotify(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.billingService.handleAlipayNotify(body);
    res.set('Content-Type', 'text/plain');
    res.send(result);
  }
}
