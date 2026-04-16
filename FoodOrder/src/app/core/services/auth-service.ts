import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { TokenStorageService } from './token-storage-service';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../models/auth.model';
import { environment } from '../../../environments/environment.development';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router)

  readonly authState = signal<AuthResponse | null>(this.storage.getAuth());

  get currentUser() {
    return this.authState();
  }

  login(request: LoginRequest) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/Auth/login`, request).pipe(
      tap((response) => this.setSession(response))
    );
  }
  register(request: RegisterRequest) {
    const formData = new FormData();
    formData.append('fullName', request.fullName);
    formData.append('email', request.email);
    formData.append('password', request.password);
    formData.append('confirmPassword', request.confirmPassword);
    formData.append('mobileNumber', request.mobileNumber);
    formData.append('address', request.address);
    formData.append('profileUrl', request.profileUrl ?? '');
    formData.append('gender', request.gender);
    formData.append('preferredContactMethod', request.preferredContactMethod);

    request.interests.forEach((interest, index) => formData.append(`interests[${index}]`, interest));

    if (request.profileImage) {
      formData.append('profileImage', request.profileImage);
    }

    return this.http.post<AuthResponse>(`${environment.apiUrl}/Auth/register`, formData).pipe(
      tap((response) => this.setSession(response))
    );
  }
  logout() {
    this.storage.clear();
    this.authState.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.authState();
  }

  hasRole(role: 'Admin' | 'User'): boolean {
    return this.authState()?.role === role;
  }

  syncProfile(profile: { fullName: string; profileUrl?: string | null }) {
    const current = this.authState();
    if (!current) {
      return;
    }

    const updated: AuthResponse = {
      ...current,
      fullName: profile.fullName,
      profileUrl: profile.profileUrl ?? current.profileUrl ?? null,
    };

    this.storage.setAuth(updated);
    this.authState.set(updated);
  }

  private setSession(response: AuthResponse): void {
    this.storage.setAuth(response);
    this.authState.set(response);
  }

}
