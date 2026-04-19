import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../../core/services/user-service';
import { AdminUserListItem } from '../../../models/user.model';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '../../../core/services/toast-service';
import { CommonModule } from '@angular/common';
import { MenuService } from '../../../core/services/menu-service';
import { AdminOrderResponse } from '../../../models/menu.model';
import { HttpErrorResponse } from '@angular/common/http';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-menu',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './admin-menu.html',
  styleUrl: './admin-menu.css',
})
export class AdminMenu implements AfterViewInit, OnDestroy {
  private static readonly STATUS_DRAFTS_STORAGE_KEY = 'food-order-admin-status-drafts';
  private static readonly ORDERS_UPDATED_EVENT_KEY = 'food-order-orders-updated-at';
  private readonly userService = inject(UserService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  @ViewChild('kpiChart') kpiChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef?: ElementRef<HTMLCanvasElement>;
  private kpiChart?: Chart;
  private ordersChart?: Chart;
  private chartsReady = false;

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
  ordersTotalPages = 0;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  readonly searchForm = this.fb.group({
    search: [''],
  });

  constructor() {
    this.loadDraftsFromStorage();
    this.loadUsers();
    this.loadOrders();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.kpiChart?.destroy();
    this.ordersChart?.destroy();
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
          this.renderCharts();
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
        this.refreshOrdersTablePage();

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
        this.renderCharts();
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
    if (this.totalPages <= 1) {
      return [1];
    }

    const start = Math.max(1, this.pageNumber - 2);
    const end = Math.min(this.totalPages, start + 4);
    const numbers: number[] = [];
    for (let page = start; page <= end; page++) {
      numbers.push(page);
    }

    return numbers;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.pageNumber = page;
    this.loadUsers();
  }

  onUsersPageSizeChange(size: string) {
    const parsed = Number(size);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return;
    }

    this.pageSize = parsed;
    this.pageNumber = 1;
    this.loadUsers();
  }

  onOrdersPageSizeChange(size: string) {
    const parsed = Number(size);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return;
    }

    this.ordersPageSize = parsed;
    this.ordersPageNumber = 1;
    this.refreshOrdersTablePage();
  }

  goToOrdersPage(page: number) {
    if (page < 1 || page > this.ordersTotalPages || page === this.ordersPageNumber) {
      return;
    }

    this.ordersPageNumber = page;
    this.refreshOrdersTablePage();
  }

  get orderPageNumbers(): number[] {
    if (this.ordersTotalPages <= 1) {
      return [1];
    }

    const start = Math.max(1, this.ordersPageNumber - 2);
    const end = Math.min(this.ordersTotalPages, start + 4);
    const numbers: number[] = [];
    for (let page = start; page <= end; page++) {
      numbers.push(page);
    }

    return numbers;
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
        this.updateTodayStats();
        this.refreshOrdersTablePage();
        this.orderStatusDrafts[normalizedOrder.orderId] = normalizedOrder.status;
        this.saveDraftsToStorage();
        localStorage.setItem(AdminMenu.ORDERS_UPDATED_EVENT_KEY, Date.now().toString());
        this.renderCharts();
        this.loadOrders();
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

  private refreshOrdersTablePage(): void {
    this.ordersTotalPages = Math.max(1, Math.ceil(this.orders.length / this.ordersPageSize));
    if (this.ordersPageNumber > this.ordersTotalPages) {
      this.ordersPageNumber = this.ordersTotalPages;
    }

    const start = (this.ordersPageNumber - 1) * this.ordersPageSize;
    this.pagedOrders = this.orders.slice(start, start + this.ordersPageSize);
  }

  private updateTodayStats(): void {
    const today = new Date();
    this.todaysOrdersCount = this.orders.filter((x) => this.isToday(new Date(x.createdAt), today)).length;
    this.todaysRevenue = this.orders
      .filter((x) => this.isToday(new Date(x.createdAt), today) && x.status !== 'Cancelled')
      .reduce((sum, x) => sum + x.totalPrice, 0);
  }

  private isToday(value: Date, today: Date): boolean {
    return value.getFullYear() === today.getFullYear()
      && value.getMonth() === today.getMonth()
      && value.getDate() === today.getDate();
  }

  private renderCharts(): void {
    if (!this.chartsReady || !this.kpiChartRef || !this.ordersChartRef) {
      return;
    }

    this.kpiChart?.destroy();
    this.ordersChart?.destroy();

    this.kpiChart = new Chart(this.kpiChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Today Orders', 'Today Revenue', 'Active Users (Page)'],
        datasets: [
          {
            label: 'Realtime Metrics',
            data: [this.todaysOrdersCount, this.todaysRevenue, this.activeUsersCount],
            backgroundColor: ['#2563eb', '#16a34a', '#f59e0b'],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
      },
    });

    const statusCounts = this.orderStatusOptions.map(
      (status) => this.orders.filter((x) => this.normalizeStatus(x.status) === status).length,
    );

    this.ordersChart = new Chart(this.ordersChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.orderStatusOptions,
        datasets: [
          {
            label: 'Order Status',
            data: statusCounts,
            backgroundColor: ['#2563eb', '#06b6d4', '#f59e0b', '#7c3aed', '#16a34a', '#dc2626'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }
}
