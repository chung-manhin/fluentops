import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private initPromise: Promise<void> | null = null;

  async canActivate(context: ExecutionContext) {
    if (!this.initPromise) {
      this.initPromise = this.onModuleInit();
    }
    await this.initPromise;
    return super.canActivate(context);
  }
}
