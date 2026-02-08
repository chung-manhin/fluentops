import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AlipayService {
  private sdk: import('alipay-sdk').AlipaySdk | null = null;
  private readonly logger = new Logger(AlipayService.name);

  constructor(private config: ConfigService) {
    const provider = this.config.get<string>('BILLING_PROVIDER') || 'mock';
    if (provider !== 'alipay') return;

    const appId = this.config.get<string>('ALIPAY_APP_ID');
    const privateKey = this.config.get<string>('ALIPAY_PRIVATE_KEY');
    const alipayPublicKey = this.config.get<string>('ALIPAY_PUBLIC_KEY');
    if (!appId || !privateKey || !alipayPublicKey) {
      this.logger.warn('BILLING_PROVIDER=alipay but missing ALIPAY_* env vars — alipay disabled');
      return;
    }

    // Dynamic import to avoid loading SDK when not needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AlipaySdk } = require('alipay-sdk') as typeof import('alipay-sdk');
    const gateway = this.config.get<string>('ALIPAY_GATEWAY') || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';
    this.sdk = new AlipaySdk({ appId, privateKey, alipayPublicKey, endpoint: gateway });
  }

  isEnabled() {
    return this.sdk !== null;
  }

  async createPagePayUrl(outTradeNo: string, subject: string, totalAmount: string, notifyUrl: string) {
    if (!this.sdk) throw new Error('Alipay SDK not initialized');
    const url = this.sdk.pageExecute('alipay.trade.page.pay', 'GET', {
      bizContent: {
        out_trade_no: outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        subject,
        total_amount: totalAmount,
      },
      notifyUrl,
    });
    return url as string;
  }

  checkNotifySign(params: Record<string, string>): boolean {
    if (!this.sdk) return false;
    return this.sdk.checkNotifySign(params);
  }
}
