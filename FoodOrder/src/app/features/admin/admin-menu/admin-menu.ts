import { Component, inject } from '@angular/core';
import { UserService } from '../../../core/services/user-service';
import { AdminUserListItem } from '../../../models/user.model';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast-service';
import { CommonModule } from '@angular/common';
import { MenuService } from '../../../core/services/menu-service';
import { AdminOrderResponse } from '../../../models/menu.model';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminDashboardPanel } from './components/dashboard/dashboard';
import { AdminUsersTable } from './components/users-table/users-table';
import { AdminOrdersTable } from './components/orders-table/orders-table';
import { AdminMenuManagement } from './components/menu-management/menu-management';

@Component({
  selector: 'app-admin-menu',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AdminMenuManagement,
    AdminDashboardPanel,
    AdminUsersTable,
    AdminOrdersTable,
  ],
  templateUrl: './admin-menu.html',
  styleUrl: './admin-menu.css',
})
export class AdminMenu {
  private static readonly STATUS_DRAFTS_STORAGE_KEY = 'food-order-admin-status-drafts';
  private static readonly ORDERS_UPDATED_EVENT_KEY = 'food-order-orders-updated-at';
  private readonly userService = inject(UserService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  todaysOrdersCount = 0;
  todaysRevenue = 0;
  activeUsersCount = 0;

  loadingUsers = false;
  loadingOrders = false;
  updatingOrderId: string | null = null;
  users: AdminUserListItem[] = [];
  orders: AdminOrderResponse[] = [];
  pagedOrders: AdminOrderResponse[] = [];
  readonly orderStatusOptions = ['Placed', 'Confirmed', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'];
  readonly orderStatusDrafts: Record<string, string> = {};
  totalCount = 0;
  pageNumber = 1;
  pageSize = 8;
  readonly pageSizeOptions = [5, 8, 10, 20];
  totalPages = 0;
  ordersPageNumber = 1;
  ordersPageSize = 8;
  ordersTotalCount = 0;
  ordersTotalPages = 0;
  ordersSortBy = 'createdAt';
  ordersSortDirection: 'asc' | 'desc' = 'desc';
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  activeSection: 'dashboard' | 'menu' | 'users' | 'orders' = 'dashboard';

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly orderSearchForm = this.fb.group({
    search: [''],
  });

  constructor() {
    this.loadDraftsFromStorage();
    this.loadUsers();
    this.loadOrders();
    this.loadOrdersPage();
  }

  loadUsers() {
    this.loadingUsers = true;
    this.userService
      .getUsers({
        pageNumber: this.pageNumber,
        pageSize: this.pageSize,
        search: this.searchForm.value.search ?? '',
        sortBy: this.sortBy,
        sortDirection: this.sortDirection,
      })
      .subscribe({
        next: (response) => {
          this.loadingUsers = false;
          this.users = response.items;
          this.activeUsersCount = response.items.filter((x) => x.isActive).length;
          this.totalCount = response.totalCount;
          this.totalPages = response.totalPages;
          this.pageNumber = response.pageNumber;
        },
        error: (error: HttpErrorResponse) => {
          this.loadingUsers = false;
          if (error.status === 0) {
            this.toastService.error('API server is not reachable. Start backend on https://localhost:7046.');
            return;
          }

          if (error.status === 401 || error.status === 403) {
            this.toastService.error('You are not authorized to load users list. Login as admin.');
            return;
          }

          this.toastService.error('Unable to load users list.');
        },
      });
  }

  loadOrders() {
    this.loadingOrders = true;
    this.menuService.getAdminOrders().subscribe({
      next: (response) => {
        this.loadingOrders = false;
        this.orders = response.map((order) => ({
          ...order,
          status: this.normalizeStatus(order.status),
        }));
        this.updateTodayStats();

        const activeOrderIds = new Set(this.orders.map((x) => x.orderId));
        for (const orderId of Object.keys(this.orderStatusDrafts)) {
          if (!activeOrderIds.has(orderId)) {
            delete this.orderStatusDrafts[orderId];
          }
        }

        for (const order of this.orders) {
          this.orderStatusDrafts[order.orderId] = order.status;
        }

        this.saveDraftsToStorage();
      },
      error: () => {
        this.loadingOrders = false;
        this.toastService.error('Unable to load orders list.');
      },
    });
  }

  loadOrdersPage() {
    this.loadingOrders = true;
    this.menuService
      .getPagedAdminOrders({
        pageNumber: this.ordersPageNumber,
        pageSize: this.ordersPageSize,
        search: this.orderSearchForm.value.search ?? '',
        sortBy: this.ordersSortBy,
        sortDirection: this.ordersSortDirection,
      })
      .subscribe({
        next: (response) => {
          this.loadingOrders = false;
          this.pagedOrders = response.items.map((order) => ({
            ...order,
            status: this.normalizeStatus(order.status),
          }));
          this.ordersTotalCount = response.totalCount;
          this.ordersTotalPages = response.totalPages;
          this.ordersPageNumber = response.pageNumber;

          for (const order of this.pagedOrders) {
            if (!this.orderStatusDrafts[order.orderId]) {
              this.orderStatusDrafts[order.orderId] = order.status;
            }
          }

          this.saveDraftsToStorage();
        },
        error: () => {
          this.loadingOrders = false;
          this.toastService.error('Unable to load orders list.');
        },
      });
  }

  applySearch() {
    this.pageNumber = 1;
    this.loadUsers();
  }

  clearSearch() {
    this.searchForm.patchValue({ search: '' });
    this.pageNumber = 1;
    this.loadUsers();
  }

  changeSort(column: string) {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }

    this.pageNumber = 1;
    this.loadUsers();
  }

  get pageNumbers(): number[] {
    return this.buildPageNumbers(this.pageNumber, this.totalPages);
  }

  goToPage(page: number) {
    const nextPage = this.resolveNextPage(page, this.pageNumber, this.totalPages);
    if (nextPage === null) {
      return;
    }

    this.pageNumber = nextPage;
    this.loadUsers();
  }

  onUsersPageSizeChange(size: string) {
    const parsed = this.parsePageSize(size);
    if (parsed === null) {
      return;
    }

    this.pageSize = parsed;
    this.pageNumber = 1;
    this.loadUsers();
  }

  onOrdersPageSizeChange(size: string) {
    const parsed = this.parsePageSize(size);
    if (parsed === null) {
      return;
    }

    this.ordersPageSize = parsed;
    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  goToOrdersPage(page: number) {
    const nextPage = this.resolveNextPage(page, this.ordersPageNumber, this.ordersTotalPages);
    if (nextPage === null) {
      return;
    }

    this.ordersPageNumber = nextPage;
    this.loadOrdersPage();
  }

  get orderPageNumbers(): number[] {
    return this.buildPageNumbers(this.ordersPageNumber, this.ordersTotalPages);
  }

  applyOrderSearch() {
    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  clearOrderSearch() {
    this.orderSearchForm.patchValue({ search: '' });
    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  changeOrderSort(column: string) {
    if (this.ordersSortBy === column) {
      this.ordersSortDirection = this.ordersSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.ordersSortBy = column;
      this.ordersSortDirection = 'asc';
    }

    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  updateOrderStatus(order: AdminOrderResponse) {
    const currentOrder = this.orders.find((x) => x.orderId === order.orderId) ?? order;
    const currentStatus = this.normalizeStatus(currentOrder.status);
    const status = this.normalizeStatus(this.orderStatusDrafts[order.orderId] ?? currentStatus);

    if (!this.orderStatusOptions.includes(status)) {
      this.orderStatusDrafts[order.orderId] = currentStatus;
      this.saveDraftsToStorage();
      this.toastService.error('Selected status is invalid. Please choose a valid status.');
      return;
    }

    if (status === currentStatus) {
      this.toastService.success('Status is unchanged.');
      return;
    }

    this.updatingOrderId = order.orderId;
    this.menuService.updateOrderStatus(order.orderId, { status }).subscribe({
      next: (updatedOrder) => {
        this.updatingOrderId = null;
        const normalizedOrder = { ...updatedOrder, status: this.normalizeStatus(updatedOrder.status) };
        this.orders = this.orders.map((x) => (x.orderId === normalizedOrder.orderId ? normalizedOrder : x));
        this.pagedOrders = this.pagedOrders.map((x) => (x.orderId === normalizedOrder.orderId ? normalizedOrder : x));
        this.updateTodayStats();
        this.orderStatusDrafts[normalizedOrder.orderId] = normalizedOrder.status;
        this.saveDraftsToStorage();
        localStorage.setItem(AdminMenu.ORDERS_UPDATED_EVENT_KEY, Date.now().toString());
        this.loadOrders();
        this.loadOrdersPage();
        this.toastService.success('Order status updated.');
      },
      error: (error: HttpErrorResponse) => {
        this.updatingOrderId = null;
        const message = this.getApiErrorMessage(error) ?? 'Unable to update order status.';
        this.toastService.error(message);
      },
    });
  }

  onStatusDraftChange(orderId: string, status: string) {
    this.orderStatusDrafts[orderId] = this.normalizeStatus(status);
    this.saveDraftsToStorage();
  }

  setActiveSection(section: 'dashboard' | 'menu' | 'users' | 'orders'): void {
    this.activeSection = section;
  }

  getStatusChipClass(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized === 'delivered') {
      return 'status-chip delivered';
    }

    if (normalized === 'cancelled') {
      return 'status-chip cancelled';
    }

    if (normalized === 'outfordelivery') {
      return 'status-chip out-for-delivery';
    }

    if (normalized === 'preparing') {
      return 'status-chip preparing';
    }

    if (normalized === 'confirmed') {
      return 'status-chip confirmed';
    }

    return 'status-chip placed';
  }

  private loadDraftsFromStorage(): void {
    const raw = localStorage.getItem(AdminMenu.STATUS_DRAFTS_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [orderId, status] of Object.entries(parsed)) {
        const normalized = this.normalizeStatus(status);
        if (this.orderStatusOptions.includes(normalized)) {
          this.orderStatusDrafts[orderId] = normalized;
        }
      }
    } catch {
      localStorage.removeItem(AdminMenu.STATUS_DRAFTS_STORAGE_KEY);
    }
  }

  private saveDraftsToStorage(): void {
    localStorage.setItem(AdminMenu.STATUS_DRAFTS_STORAGE_KEY, JSON.stringify(this.orderStatusDrafts));
  }

  private normalizeStatus(status: string): string {
    const trimmed = (status ?? '').trim();
    const normalizedKey = trimmed.replace(/[^a-z0-9]/gi, '').toLowerCase();

    const match = this.orderStatusOptions.find(
      (x) => x.replace(/[^a-z0-9]/gi, '').toLowerCase() === normalizedKey,
    );

    return match ?? trimmed;
  }

  private getApiErrorMessage(error: HttpErrorResponse): string | null {
    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    return null;
  }

  private updateTodayStats(): void {
    const today = new Date();
    this.todaysOrdersCount = this.orders.filter((x) => this.isToday(new Date(x.createdAt), today)).length;
    this.todaysRevenue = this.orders
      .filter((x) => this.isToday(new Date(x.createdAt), today) && x.status !== 'Cancelled')
      .reduce((sum, x) => sum + x.totalPrice, 0);
  }

  private parsePageSize(size: string): number | null {
    const parsed = Number(size);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private resolveNextPage(requestedPage: number, currentPage: number, totalPages: number): number | null {
    if (requestedPage < 1 || requestedPage > totalPages || requestedPage === currentPage) {
      return null;
    }

    return requestedPage;
  }

  private buildPageNumbers(currentPage: number, totalPages: number): number[] {
    if (totalPages <= 1) {
      return [1];
    }

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const numbers: number[] = [];
    for (let page = start; page <= end; page++) {
      numbers.push(page);
    }

    return numbers;
  }

  private isToday(value: Date, today: Date): boolean {
    return value.getFullYear() === today.getFullYear()
      && value.getMonth() === today.getMonth()
      && value.getDate() === today.getDate();
  }
}
