import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth-service';
import { Router, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment.development';
import { CartStateService } from '../../core/services/cart-state-service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly cartStateService = inject(CartStateService);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.authService.hasRole('Admin');
  }

  isUser(): boolean {
    return this.authService.hasRole('User');
  }

  currentUser() {
    return this.authService.currentUser;
  }

  cartCount(): number {
    return this.cartStateService.cartCount();
  }

  logout() {
    this.cartStateService.reset();
    this.authService.logout();
  }

  goToDashboard() {
    if (this.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.router.navigate(['/menu']);
  }

  get profileImageUrl(): string | null {
    const profileUrl = this.currentUser()?.profileUrl;
    if (!profileUrl) {
      return null;
    }

    if (profileUrl.startsWith('http')) {
      return profileUrl;
    }

    const apiHost = environment.apiUrl.replace('/api', '');
    return `${apiHost}${profileUrl}`;
  }
}
