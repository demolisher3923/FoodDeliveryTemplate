import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartStateService {
  readonly cartCount = signal(0);

  setCartCount(value: number): void {
    this.cartCount.set(Math.max(0, value));
  }

  reset(): void {
    this.cartCount.set(0);
  }
}
