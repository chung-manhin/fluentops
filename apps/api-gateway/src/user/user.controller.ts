import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth';

@Controller()
export class UserController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: { user: { id: string; email: string } }) {
    return req.user;
  }
}
