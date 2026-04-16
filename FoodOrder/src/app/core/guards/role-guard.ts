import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService)
  const router = inject(Router)
  const expectedRole = route.data['role'] as 'Admin' | 'User';

  if(authService.isLoggedIn() && authService.hasRole(expectedRole)){
    return true;
  }

  return router.createUrlTree(['/']);
};
