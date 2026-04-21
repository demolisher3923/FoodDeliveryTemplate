import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth-service';
import { Router, RouterLink } from '@angular/router';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '../../../core/services/toast-service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });
  
  loading = false;
  hidePassword = true;

  constructor(
    private readonly authService:AuthService,
    private readonly router : Router,
    private readonly toastService: ToastService
  ){}

  submit(){
    if(this.form.invalid || this.loading){
      return;
    }
    this.loading = true;
    this.authService.login(this.form.getRawValue() as {email:string; password:string}).subscribe({
      next:(response) =>{
        this.loading = false;
        this.toastService.success('Signed in successfully.');
        this.router.navigate([response.role === "Admin" ? "/admin/dashboard": "/menu"]);
      },
      error:() => {
        this.loading = false;
        this.toastService.error('Login failed. Please check your credentials.');
      }
    })

  }
}

