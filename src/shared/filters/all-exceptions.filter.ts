import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    super.catch(exception, host);
    // You can add custom logging or transformation here
    // If it's not a WsException, you might want to wrap it or log it differently
    const client = host.switchToWs().getClient();
    if (exception instanceof WsException) {
      client.emit('exception', {
        status: 'error',
        message: exception.getError(),
      });
    } else {
      client.emit('exception', {
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
}

@Catch()
export class GlobalHttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    Logger.error(
      `HTTP Exception: ${request.method} ${request.url} - Status: ${status} - Message: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : '',
      'GlobalHttpExceptionFilter',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
