import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../core/services/auth-service';
import { MenuService } from '../../core/services/menu-service';
import { CartItem, MenuItem, MenuItemRequest, OrderResponse } from '../../models/menu.model';
import { ToastService } from '../../core/services/toast-service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-menu',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly isAdmin = computed(() => this.authService.hasRole('Admin'));
  readonly isUser = computed(() => this.authService.hasRole('User'));

  loading = false;
  saving = false;
  orderLoadingId: string | null = null;

  message = '';
  errorMessage = '';

  menuItems: MenuItem[] = [];
  myOrders: OrderResponse[] = [];
  readonly itemQuantities: Record<string, number> = {};
  cartItems: CartItem[] = [];

  editingItemId: string | null = null;

  readonly menuForm = this.fb.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(1)]],
    imageUrl: [''],
    isAvailable: [true],
  });

  constructor() {
    this.loadMenu();

    if (this.isUser()) {
      this.loadMyOrders();
    }
  }

  loadMenu() {
    this.loading = true;
    this.menuService.getMenu().subscribe({
      next: (menu) => {
        this.loading = false;
        this.menuItems = menu;

        for (const item of menu) {
          if (!this.itemQuantities[item.id]) {
            this.itemQuantities[item.id] = 1;
          }
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load menu.';
        this.toastService.error(this.errorMessage);
      },
    });
  }

  decrementQuantity(itemId: string) {
    const currentQuantity = this.itemQuantities[itemId] ?? 1;
    this.itemQuantities[itemId] = Math.max(1, currentQuantity - 1);
  }

  incrementQuantity(itemId: string) {
    const currentQuantity = this.itemQuantities[itemId] ?? 1;
    this.itemQuantities[itemId] = currentQuantity + 1;
  }

  loadMyOrders() {
    this.menuService.getMyOrders().subscribe({
      next: (orders) => {
        this.myOrders = orders;
      },
    });
  }

  startEdit(item: MenuItem) {
    this.editingItemId = item.id;
    this.menuForm.patchValue({
      name: item.name,
      description: item.description,
      price: item.price,
      imageUrl: item.imageUrl ?? '',
      isAvailable: item.isAvailable,
    });
  }

  resetForm() {
    this.editingItemId = null;
    this.menuForm.reset({
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      isAvailable: true,
    });
  }

  saveMenuItem() {
    if (this.menuForm.invalid || this.saving || !this.isAdmin()) {
      this.menuForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    const value = this.menuForm.getRawValue();
    const request: MenuItemRequest = {
      name: value.name ?? '',
      description: value.description ?? '',
      price: Number(value.price ?? 0),
      imageUrl: value.imageUrl ?? '',
      isAvailable: !!value.isAvailable,
    };

    const call = this.editingItemId
      ? this.menuService.updateMenuItem(this.editingItemId, request)
      : this.menuService.createMenuItem(request);

    call.subscribe({
      next: () => {
        this.saving = false;
        this.message = this.editingItemId ? 'Menu item updated.' : 'Menu item created.';
        this.toastService.success(this.message);
        this.resetForm();
        this.loadMenu();
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'Failed to save menu item.';
        this.toastService.error(this.errorMessage);
      },
    });
  }

  placeOrder(item: MenuItem) {
    if (!this.isUser() || !item.isAvailable) {
      return;
    }

    const quantity = this.itemQuantities[item.id] ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      this.errorMessage = 'Quantity must be at least 1.';
      this.toastService.error(this.errorMessage);
      return;
    }

    const existing = this.cartItems.find((x) => x.menuItemId === item.id);
    if (existing) {
      existing.quantity += quantity;
      existing.totalPrice = existing.unitPrice * existing.quantity;
    } else {
      this.cartItems.push({
        menuItemId: item.id,
        menuItemName: item.name,
        unitPrice: item.price,
        quantity,
        totalPrice: item.price * quantity,
      });
    }

    this.itemQuantities[item.id] = 1;
    this.message = `${item.name} added to cart.`;
    this.toastService.success(this.message);
  }

  removeCartItem(menuItemId: string) {
    this.cartItems = this.cartItems.filter((x) => x.menuItemId !== menuItemId);
  }

  get cartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  async checkout() {
    if (!this.isUser() || this.cartItems.length === 0) {
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm checkout?',
      text: `Total amount: ₹${this.cartTotal}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Okay',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.orderLoadingId = 'checkout';
    this.message = '';
    this.errorMessage = '';

    const calls = this.cartItems.map((item) => this.menuService.placeOrder(item.menuItemId, { quantity: item.quantity }));

    forkJoin(calls).subscribe({
      next: () => {
        this.orderLoadingId = null;
        this.cartItems = [];
        this.loadMyOrders();
        this.toastService.success('Order placed successfully.');
      },
      error: () => {
        this.orderLoadingId = null;
        this.errorMessage = 'Unable to complete checkout.';
        this.toastService.error(this.errorMessage);
      },
    });
  }
}
