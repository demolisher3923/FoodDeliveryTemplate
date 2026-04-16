import { Injectable } from '@angular/core';
import { AuthResponse } from '../../models/auth.model';

const AUTH_KEY = "food-order-auth"
@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  setAuth(auth:AuthResponse):void{
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }

  getAuth():AuthResponse | null {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? (JSON.parse(data) as AuthResponse):null
  }

  clear(): void{
    localStorage.removeItem(AUTH_KEY);
  }

  getToken():string | null{
    return this.getAuth()?.token ?? null
  }
}
