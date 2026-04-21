import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CartItem } from '../../../../models/menu.model';

@Component({
  selector: 'app-user-cart',
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class UserCart {
  @Input() cartItems: CartItem[] = [];
  @Input() cartTotal = 0;
  @Input() isCheckingOut = false;

  @Output() itemRemoved = new EventEmitter<string>();
  @Output() checkoutClicked = new EventEmitter<void>();
}
