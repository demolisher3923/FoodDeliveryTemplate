import { Component, OnDestroy, computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth-service';
import { MenuService } from '../../core/services/menu-service';
import { CartItem, MenuItem, OrderResponse } from '../../models/menu.model';
import { ToastService } from '../../core/services/toast-service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { MenuItemCard } from './components/menu-item-card/menu-item-card';
import { CartStateService } from '../../core/services/cart-state-service';
import { UserCart } from './components/cart/cart';
import { UserOrders } from './components/user-orders/user-orders';
import { AdminMenuManagement } from '../admin/admin-menu/components/menu-management/menu-management';

@Component({
  selector: 'app-menu',
  imports: [
    MenuItemCard,
    UserCart,
    UserOrders,
    AdminMenuManagement,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnDestroy {
  private static readonly ORDERS_UPDATED_EVENT_KEY = 'food-order-orders-updated-at';
  private ordersRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly toastService = inject(ToastService);
  private readonly cartStateService = inject(CartStateService);
  private readonly route = inject(ActivatedRoute);

  readonly isAdmin = computed(() => this.authService.hasRole('Admin'));
  readonly isUser = computed(() => this.authService.hasRole('User'));
  loading = false;
  orderLoadingId: string | null = null;

  message = '';
  errorMessage = '';

  menuItems: MenuItem[] = [];
  myOrders: OrderResponse[] = [];
  readonly itemQuantities: Record<string, number> = {};
  cartItems: CartItem[] = [];

  activeUserSection: 'menu' | 'cart' | 'orders' = 'menu';

  private readonly onStorageChange = (event: StorageEvent): void => {
    if (!this.isUser() || event.key !== Menu.ORDERS_UPDATED_EVENT_KEY) {
      return;
    }

    this.loadMyOrders();
  };

  constructor() {
    if (this.isUser()) {
      this.loadMenu();
      this.loadMyCart();
      this.loadMyOrders();
      this.startOrdersAutoRefresh();
      this.watchActiveSection();
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

  loadMenu(): void {
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

  decrementQuantity(itemId: string): void {
    const currentQuantity = this.itemQuantities[itemId] ?? 1;
    this.itemQuantities[itemId] = Math.max(1, currentQuantity - 1);
  }

  incrementQuantity(itemId: string): void {
    const currentQuantity = this.itemQuantities[itemId] ?? 1;
    this.itemQuantities[itemId] = currentQuantity + 1;
  }

  loadMyOrders(): void {
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

  loadMyCart(): void {
    this.menuService.getMyCart().subscribe({
      next: (cartItems) => {
        this.setCartItems(cartItems);
      },
      error: () => {
        this.toastService.error('Unable to load your cart.');
      },
    });
  }

  placeOrder(item: MenuItem): void {
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

  removeCartItem(menuItemId: string): void {
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

  async checkout(): Promise<void> {
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

  private watchActiveSection(): void {
    this.route.queryParamMap.subscribe((params) => {
      const section = params.get('section');
      if (section === 'menu' || section === 'cart' || section === 'orders') {
        this.activeUserSection = section;
      }
    });
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
    const statuses: Record<string, string> = {
      placed: 'Placed',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      outfordelivery: 'OutForDelivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    return statuses[compressed] ?? value;
  }
}
