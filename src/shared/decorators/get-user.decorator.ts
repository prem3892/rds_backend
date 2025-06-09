import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    Logger.debug(`Retrieved user: ${JSON.stringify(user)}`, GetUser.name);

    // If a specific field is provided, return just that field
    return data ? user?.[data] : user;
  },
);
