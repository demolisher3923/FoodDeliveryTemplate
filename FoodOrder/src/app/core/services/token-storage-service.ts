import { Injectable } from '@angular/core';
import { AuthResponse } from '../../models/auth.model';

const AUTH_KEY = 'food-order-auth';

type StoredAuth = Omit<AuthResponse, 'token'> & { token: string };

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  setAuth(auth: AuthResponse): void {
    const storedAuth: StoredAuth = {
      userId: auth.userId,
      fullName: auth.fullName,
      email: auth.email,
      role: auth.role,
      profileUrl: auth.profileUrl ?? null,
      token: auth.token,
    };

    sessionStorage.setItem(AUTH_KEY, JSON.stringify(storedAuth));
  }

  getAuth(): StoredAuth | null {
    const data = sessionStorage.getItem(AUTH_KEY);
    if (!data) {
      return null;
    }

    return JSON.parse(data) as StoredAuth;
  }

  clear(): void {
    sessionStorage.removeItem(AUTH_KEY);
  }

  getToken(): string | null {
    const auth = this.getAuth();
    if (!auth) {
      return null;
    }

    return auth.token;
  }

  getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const payload = this.decodeTokenPayload(token);
    if (payload === null || typeof payload.exp !== 'number') {
      return null;
    }

    return new Date(payload.exp * 1000);
  }

  isTokenExpired(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) {
      return true;
    }

    return expiration.getTime() <= Date.now();
  }

  private decodeTokenPayload(token: string): { exp?: number } | null {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');

    try {
      return JSON.parse(atob(paddedPayload)) as { exp?: number };
    } catch {
      return null;
    }
  }
}
