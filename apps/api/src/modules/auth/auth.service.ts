import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  register(body: { email: string; password: string }) {
    return {
      user: { id: '00000000-0000-0000-0000-000000000001', email: body.email },
      accessToken: 'replace-with-jwt',
      refreshToken: 'replace-with-refresh-token',
    };
  }

  login(body: { email: string; password: string }) {
    return {
      user: { id: '00000000-0000-0000-0000-000000000001', email: body.email },
      accessToken: 'replace-with-jwt',
      refreshToken: 'replace-with-refresh-token',
    };
  }

  mockProfile() {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@speakingos.local',
      targetBand: 7,
      timezone: 'Asia/Shanghai',
      onboardingStatus: 'pending',
    };
  }
}
