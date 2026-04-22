import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '../../../../../core/services/toast-service';
import { MenuService } from '../../../../../core/services/menu-service';
import { AdminOrderResponse } from '../../../../../models/menu.model';

@Component({
  selector: 'app-admin-orders-table',
  imports: [CommonModule, MatCardModule, MatButtonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './orders-table.html',
  styleUrl: './orders-table.css',
})
export class AdminOrdersTable implements OnInit {
  private static readonly STATUS_DRAFTS_STORAGE_KEY = 'food-order-admin-status-drafts';
  private static readonly ORDERS_UPDATED_EVENT_KEY = 'food-order-orders-updated-at';
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly toastService = inject(ToastService);

  loadingOrders = false;
  updatingOrderId: string | null = null;
  orders: AdminOrderResponse[] = [];
  pagedOrders: AdminOrderResponse[] = [];
  ordersCount = 0;
  ordersPageNumber = 1;
  ordersPageSize = 8;
  ordersTotalPages = 0;
  ordersSortBy = 'createdAt';
  ordersSortDirection: 'asc' | 'desc' = 'desc';
  readonly pageSizeOptions = [5, 8, 10, 20];
  readonly orderStatusOptions = ['Placed', 'Confirmed', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'];
  readonly orderStatusDrafts: Record<string, string> = {};

  readonly orderSearchForm = this.fb.group({
    search: [''],
  });

  ngOnInit(): void {
    this.loadDraftsFromStorage();
    this.loadOrders();
    this.loadOrdersPage();
  }

  loadOrders(): void {
    this.loadingOrders = true;
    this.menuService.getAdminOrders().subscribe({
      next: (response) => {
        this.loadingOrders = false;
        this.orders = response.map((order) => ({
          ...order,
          status: this.normalizeStatus(order.status),
        }));
        this.syncDraftsWithOrders();
      },
      error: () => {
        this.loadingOrders = false;
        this.toastService.error('Unable to load orders list.');
      },
    });
  }

  loadOrdersPage(): void {
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
          this.ordersCount = response.totalCount;
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

  applyOrderSearch(): void {
    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  clearOrderSearch(): void {
    this.orderSearchForm.patchValue({ search: '' });
    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  changeOrderSort(column: string): void {
    if (this.ordersSortBy === column) {
      this.ordersSortDirection = this.ordersSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.ordersSortBy = column;
      this.ordersSortDirection = 'asc';
    }

    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  onOrdersPageSizeChange(size: string): void {
    const parsed = this.parsePageSize(size);
    if (parsed === null) {
      return;
    }

    this.ordersPageSize = parsed;
    this.ordersPageNumber = 1;
    this.loadOrdersPage();
  }

  goToOrdersPage(page: number): void {
    const nextPage = this.resolveNextPage(page, this.ordersPageNumber, this.ordersTotalPages);
    if (nextPage === null) {
      return;
    }

    this.ordersPageNumber = nextPage;
    this.loadOrdersPage();
  }

  updateOrderStatus(order: AdminOrderResponse): void {
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
        this.orderStatusDrafts[normalizedOrder.orderId] = normalizedOrder.status;
        this.saveDraftsToStorage();
        localStorage.setItem(AdminOrdersTable.ORDERS_UPDATED_EVENT_KEY, Date.now().toString());
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

  onStatusDraftChange(orderId: string, status: string): void {
    this.orderStatusDrafts[orderId] = this.normalizeStatus(status);
    this.saveDraftsToStorage();
  }

  get orderPageNumbers(): number[] {
    return this.buildPageNumbers(this.ordersPageNumber, this.ordersTotalPages);
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

  private syncDraftsWithOrders(): void {
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
  }

  private loadDraftsFromStorage(): void {
    const raw = localStorage.getItem(AdminOrdersTable.STATUS_DRAFTS_STORAGE_KEY);
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
      localStorage.removeItem(AdminOrdersTable.STATUS_DRAFTS_STORAGE_KEY);
    }
  }

  private saveDraftsToStorage(): void {
    localStorage.setItem(AdminOrdersTable.STATUS_DRAFTS_STORAGE_KEY, JSON.stringify(this.orderStatusDrafts));
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

  private parsePageSize(size: string): number | null {
    const parsed = Number(size);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
}
