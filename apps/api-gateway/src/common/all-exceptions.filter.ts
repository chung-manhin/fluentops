import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp ? exception.message : 'Internal Server Error';
    const requestId = req.headers['x-request-id'] as string | undefined;

    if (!isHttp) {
      this.logger.error(`Unhandled exception [${requestId}]`, exception instanceof Error ? exception.stack : exception);
    }

    res.status(statusCode).json({
      statusCode,
      message,
      error: isHttp ? (exception.getResponse() as Record<string, unknown>).error ?? message : 'Internal Server Error',
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
