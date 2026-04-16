import { Component, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth-service';
import { Router, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-header',
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  readonly isLoggedIn = computed(() => this.authService.isLoggedIn());
  readonly isAdmin = computed(()=> this.authService.hasRole('Admin'));
  readonly isUser = computed(()=> this.authService.hasRole('User'));
  readonly currentUser = computed(() => this.authService.currentUser);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ){}

  logout(){
    this.authService.logout();
  }

  goToDashboard(){
    if(this.isAdmin()){
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
