import { Component, OnDestroy, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth-service';
import { MenuService } from '../../core/services/menu-service';
import { CartItem, MenuItem, MenuItemRequest, OrderResponse } from '../../models/menu.model';
import { ToastService } from '../../core/services/toast-service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { MenuItemCard } from './components/menu-item-card/menu-item-card';
import { CartStateService } from '../../core/services/cart-state-service';
import { environment } from '../../../environments/environment.development';
import { UserCart } from './components/cart/cart';
import { UserOrders } from './components/user-orders/user-orders';

@Component({
  selector: 'app-menu',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSelectModule,
    MenuItemCard,
    UserCart,
    UserOrders,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnDestroy {
  private static readonly ORDERS_UPDATED_EVENT_KEY = 'food-order-orders-updated-at';
  private ordersRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly cartStateService = inject(CartStateService);

  readonly isAdmin = computed(() => this.authService.hasRole('Admin'));
  readonly isUser = computed(() => this.authService.hasRole('User'));
  readonly categories = ['Fast Food', 'Pizza', 'Beverages', 'Dessert', 'Healthy'];
  loading = false;
  saving = false;
  orderLoadingId: string | null = null;
  imageError = '';
  selectedProductImage: File | null = null;
  productImagePreview: string | null = null;
  existingImageUrl = '';

  message = '';
  errorMessage = '';

  menuItems: MenuItem[] = [];
  myOrders: OrderResponse[] = [];
  readonly itemQuantities: Record<string, number> = {};
  cartItems: CartItem[] = [];

  editingItemId: string | null = null;
  activeUserSection: 'menu' | 'cart' | 'orders' = 'menu';

  readonly menuForm = this.fb.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    category: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(1)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    isAvailable: [true],
  });

  private readonly onStorageChange = (event: StorageEvent): void => {
    if (!this.isUser() || event.key !== Menu.ORDERS_UPDATED_EVENT_KEY) {
      return;
    }

    this.loadMyOrders();
  };

  constructor() {
    this.loadMenu();

    if (this.isUser()) {
      this.loadMyCart();
      this.loadMyOrders();
      this.startOrdersAutoRefresh();
      window.addEventListener('storage', this.onStorageChange);
      return;
    }

    this.cartStateService.setCartCount(0);
  }

  ngOnDestroy(): void {
    if (this.ordersRefreshTimer) {
      clearInterval(this.ordersRefreshTimer);
      this.ordersRefreshTimer = null;
    }

    window.removeEventListener('storage', this.onStorageChange);
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
        this.myOrders = orders.map((order) => ({
          ...order,
          status: this.toCanonicalStatus(order.status),
        }));
      },
      error: () => {
        this.toastService.error('Unable to load your orders.');
      },
    });
  }

  loadMyCart() {
    this.menuService.getMyCart().subscribe({
      next: (cartItems) => {
        this.setCartItems(cartItems);
      },
      error: () => {
        this.toastService.error('Unable to load your cart.');
      },
    });
  }

  startEdit(item: MenuItem) {
    this.editingItemId = item.id;
    this.menuForm.patchValue({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      stockQuantity: item.stockQuantity,
      isAvailable: item.isAvailable,
    });
    this.existingImageUrl = item.imageUrl ?? '';
    this.selectedProductImage = null;
    this.productImagePreview = this.resolveImageUrl(this.existingImageUrl);
    this.imageError = '';
  }

  resetForm() {
    this.editingItemId = null;
    this.menuForm.reset({
      name: '',
      description: '',
      category: '',
      price: 0,
      stockQuantity: 0,
      isAvailable: true,
    });
    this.existingImageUrl = '';
    this.selectedProductImage = null;
    this.productImagePreview = null;
    this.imageError = '';
  }

  onProductImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.selectedProductImage = null;
      this.productImagePreview = this.resolveImageUrl(this.existingImageUrl);
      return;
    }

    const validTypes = ['image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      this.imageError = 'Only JPG and PNG product images are allowed.';
      this.selectedProductImage = null;
      this.productImagePreview = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'Image must be 5MB or smaller.';
      this.selectedProductImage = null;
      this.productImagePreview = null;
      return;
    }

    this.imageError = '';
    this.selectedProductImage = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.productImagePreview = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  saveMenuItem() {
    if (this.menuForm.invalid || this.saving || !this.isAdmin() || !!this.imageError) {
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
      category: value.category ?? '',
      price: Number(value.price ?? 0),
      stockQuantity: Number(value.stockQuantity ?? 0),
      imageUrl: this.existingImageUrl,
      isAvailable: !!value.isAvailable,
      imageFile: this.selectedProductImage,
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

  async deleteMenuItem(item: MenuItem) {
    if (!this.isAdmin()) {
      return;
    }

    const result = await Swal.fire({
      title: 'Delete product?',
      text: `${item.name} will be removed from active menu.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.menuService.deleteMenuItem(item.id).subscribe({
      next: () => {
        this.toastService.success('Product deleted.');
        this.loadMenu();
      },
      error: () => {
        this.toastService.error('Failed to delete product.');
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
    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    this.orderLoadingId = item.id;
    this.menuService.upsertCartItem(item.id, { quantity: nextQuantity }).subscribe({
      next: (cartItems) => {
        this.orderLoadingId = null;
        this.setCartItems(cartItems);
        this.itemQuantities[item.id] = 1;
        this.message = `${item.name} added to cart.`;
        this.toastService.success(this.message);
      },
      error: (error) => {
        this.orderLoadingId = null;
        const message = this.extractApiErrorMessage(error) ?? 'Unable to update cart.';
        this.toastService.error(message);
      },
    });
  }

  removeCartItem(menuItemId: string) {
    this.menuService.removeCartItem(menuItemId).subscribe({
      next: (cartItems) => {
        this.setCartItems(cartItems);
      },
      error: () => {
        this.toastService.error('Unable to remove item from cart.');
      },
    });
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

    try {
      const failedItems: CartItem[] = [];
      const failedMessages: string[] = [];
      let successCount = 0;

      for (const item of this.cartItems) {
        try {
          await firstValueFrom(this.menuService.placeOrder(item.menuItemId, { quantity: item.quantity }));
          successCount += 1;
        } catch (error) {
          failedItems.push(item);
          const itemError = this.extractApiErrorMessage(error) ?? 'Unable to place this item.';
          failedMessages.push(`${item.menuItemName}: ${itemError}`);
        }
      }

      this.cartItems = failedItems;
      this.cartStateService.setCartCount(this.cartItems.length);

      if (successCount > 0) {
        this.loadMyOrders();
        this.loadMenu();
        this.loadMyCart();
      }

      if (successCount > 0 && failedItems.length === 0) {
        this.toastService.success('Order placed successfully.');
      } else if (successCount > 0 && failedItems.length > 0) {
        this.toastService.success(`${successCount} item(s) placed. ${failedItems.length} item(s) left in cart.`);
        this.errorMessage = failedMessages.join(' | ');
      } else {
        this.errorMessage = failedMessages.join(' | ') || 'Unable to complete checkout.';
        this.toastService.error(this.errorMessage);
      }
    } finally {
      this.orderLoadingId = null;
    }
  }

  setActiveUserSection(section: 'menu' | 'cart' | 'orders'): void {
    this.activeUserSection = section;
  }

  private resolveImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl || !imageUrl.trim()) {
      return null;
    }

    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:image')) {
      return imageUrl;
    }

    const apiHost = environment.apiUrl.replace('/api', '');
    return `${apiHost}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  }

  private extractApiErrorMessage(error: unknown): string | null {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string') {
        return error.error;
      }

      if (error.error?.message) {
        return error.error.message;
      }
    }

    return null;
  }

  private setCartItems(cartItems: CartItem[]): void {
    this.cartItems = cartItems;
    this.cartStateService.setCartCount(cartItems.length);
  }

  private startOrdersAutoRefresh(): void {
    this.ordersRefreshTimer = setInterval(() => {
      this.loadMyOrders();
    }, 5000);
  }

  private toCanonicalStatus(status: string): string {
    const value = (status ?? '').trim();
    const compressed = value.replace(/[^a-z0-9]/gi, '').toLowerCase();

    if (compressed === 'placed') {
      return 'Placed';
    }

    if (compressed === 'confirmed') {
      return 'Confirmed';
    }

    if (compressed === 'preparing') {
      return 'Preparing';
    }

    if (compressed === 'outfordelivery') {
      return 'OutForDelivery';
    }

    if (compressed === 'delivered') {
      return 'Delivered';
    }

    if (compressed === 'cancelled') {
      return 'Cancelled';
    }

    return value;
  }

}
