import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class E2eTestingGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.E2E_TESTING !== 'true') {
      throw new NotFoundException();
    }

    return true;
  }
}
