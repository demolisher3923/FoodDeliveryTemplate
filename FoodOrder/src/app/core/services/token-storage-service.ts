import { Injectable } from '@angular/core';
import { AuthResponse } from '../../models/auth.model';

const AUTH_KEY = 'food-order-auth';
type JwtPayload = { exp?: number };

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  setAuth(auth: AuthResponse): void {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }

  getAuth(): AuthResponse | null {
    const data = sessionStorage.getItem(AUTH_KEY);
    return data ? (JSON.parse(data) as AuthResponse) : null;
  }

  clear(): void {
    sessionStorage.removeItem(AUTH_KEY);
  }

  getToken(): string | null {
    return this.getAuth()?.token ?? null;
  }

  getTokenExpiration(): Date | null {
    const expirationMs = this.getTokenExpirationMs();
    if (expirationMs === null) {
      return null;
    }

    return new Date(expirationMs);
  }

  isTokenExpired(): boolean {
    const expirationMs = this.getTokenExpirationMs();
    if (expirationMs === null) {
      return true;
    }

    return expirationMs <= Date.now();
  }

  private getTokenExpirationMs(): number | null {
    const payload = this.decodeTokenPayload(this.getToken());
    if (typeof payload?.exp !== 'number') {
      return null;
    }

    return payload.exp * 1000;
  }

  private decodeTokenPayload(token: string | null): JwtPayload | null {
    if (!token) {
      return null;
    }

    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return null;
    }

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    try {
      return JSON.parse(atob(paddedBase64)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
