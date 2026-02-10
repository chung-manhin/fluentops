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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available plans' })
  @ApiResponse({ status: 200, description: 'Array of plans' })
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user credit balance' })
  @ApiResponse({ status: 200, description: 'Credit balance' })
  getBalance(@Req() req: AuthenticatedRequest) {
    return this.billingService.getBalance(req.user.id);
  }

  @Post('order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  createOrder(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.billingService.createOrder(req.user.id, dto.planId);
  }

  @Post('mock/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate payment (non-production only)' })
  @ApiResponse({ status: 201, description: 'Order fulfilled' })
  @ApiResponse({ status: 404, description: 'Not available in production' })
  mockPay(@Req() req: AuthenticatedRequest, @Body() dto: MockPayDto) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
    return this.billingService.mockPay(dto.orderId, req.user.id);
  }

  @Post('alipay/notify')
  @ApiExcludeEndpoint()
  async alipayNotify(@Body() body: Record<string, string>, @Res() res: Response) {
    const result = await this.billingService.handleAlipayNotify(body);
    res.set('Content-Type', 'text/plain');
    res.send(result);
  }
}
