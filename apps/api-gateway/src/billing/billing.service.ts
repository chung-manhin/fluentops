import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.prisma.plan.upsert({
      where: { code: 'credits-10' },
      update: {},
      create: { code: 'credits-10', name: '10 AI Credits', type: 'CREDITS', credits: 10, priceCents: 999 },
    });
  }

  listPlans() {
    return this.prisma.plan.findMany();
  }

  async getBalance(userId: string) {
    const row = await this.prisma.userBalance.findUnique({ where: { userId } });
    return { credits: row?.credits ?? 0 };
  }

  async createOrder(userId: string, planId: string) {
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: planId } });
    const provider = this.config.get<string>('BILLING_PROVIDER') || 'mock';
    return this.prisma.order.create({
      data: {
        userId,
        planId,
        amountCents: plan.priceCents,
        provider: provider.toUpperCase() as 'MOCK' | 'ALIPAY',
      },
    });
  }

  async mockPay(orderId: string, userId: string) {
    const provider = this.config.get<string>('BILLING_PROVIDER') || 'mock';
    if (provider !== 'mock') throw new BadRequestException('Mock pay not available');
    const order = await this.prisma.order.findFirstOrThrow({ where: { id: orderId, userId } });
    if (order.status === 'PAID') return order;
    return this.fulfillOrder(orderId);
  }

  async fulfillOrder(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { plan: true } });
    if (order.status === 'PAID') return order;

    const credits = order.plan.credits ?? 0;
    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: 'PAID', paidAt: new Date() } }),
      this.prisma.userBalance.upsert({
        where: { userId: order.userId },
        create: { userId: order.userId, credits },
        update: { credits: { increment: credits } },
      }),
      this.prisma.creditLedger.create({
        data: { userId: order.userId, delta: credits, reason: 'purchase', refId: orderId },
      }),
    ]);
    return updated;
  }

  async hasCredits(userId: string) {
    const row = await this.prisma.userBalance.findUnique({ where: { userId } });
    return (row?.credits ?? 0) > 0;
  }

  async deductCredit(userId: string, reason: string, refId?: string) {
    await this.prisma.$transaction([
      this.prisma.userBalance.update({ where: { userId }, data: { credits: { decrement: 1 } } }),
      this.prisma.creditLedger.create({ data: { userId, delta: -1, reason, refId } }),
    ]);
  }
}
