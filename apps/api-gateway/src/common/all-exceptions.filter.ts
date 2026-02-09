import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp ? exception.message : 'Internal Server Error';

    res.status(statusCode).json({
      statusCode,
      message,
      error: isHttp ? (exception.getResponse() as Record<string, unknown>).error ?? message : 'Internal Server Error',
      timestamp: new Date().toISOString(),
    });
  }
}
