import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
  register(@Body() body: { email: string; password: string }) {
    return this.authService.register(body);
  }

  @Post('auth/login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Post('auth/refresh')
  refresh() {
    return { accessToken: 'replace-with-jwt', refreshToken: 'replace-with-rotated-refresh-token' };
  }

  @Post('auth/logout')
  logout() {
    return { ok: true };
  }

  @Get('me')
  me() {
    return this.authService.mockProfile();
  }

  @Patch('me')
  updateMe(@Body() body: Record<string, unknown>) {
    return { ...this.authService.mockProfile(), ...body };
  }
}
