import { Injectable } from '@angular/core';
import { AuthResponse } from '../../models/auth.model';

const AUTH_KEY = 'food-order-auth';

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  setAuth(auth: AuthResponse): void {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }

  getAuth(): AuthResponse | null {
    const data = localStorage.getItem(AUTH_KEY);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as AuthResponse;
  }

  clear(): void {
    localStorage.removeItem(AUTH_KEY);
  }

  getToken(): string | null {
    const auth = this.getAuth();
    if (!auth) {
      return null;
    }

    return auth.token;
  }
}
