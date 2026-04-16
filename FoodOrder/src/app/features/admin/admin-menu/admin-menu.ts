import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-admin-menu',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './admin-menu.html',
  styleUrl: './admin-menu.css',
})
export class AdminMenu {
  private readonly userService = inject(UserService);
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly stats = [
    { title: 'Orders Today', value: '148', delta: '+12%' },
    { title: 'Active Users', value: '1,204', delta: '+8%' },
    { title: 'Revenue', value: '$8,420', delta: '+16%' },
  ];

  loadingUsers = false;
  loadingOrders = false;
  updatingOrderId: string | null = null;
  users: AdminUserListItem[] = [];
  orders: AdminOrderResponse[] = [];
  readonly orderStatusOptions = ['Placed', 'Confirmed', 'Preparing', 'OutForDelivery', 'Delivered', 'Cancelled'];
  readonly orderStatusDrafts: Record<string, string> = {};
  totalCount = 0;
  pageNumber = 1;
  pageSize = 8;
  totalPages = 0;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  readonly searchForm = this.fb.group({
    search: [''],
  });

  constructor() {
    this.loadUsers();
    this.loadOrders();
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
        this.orders = response;
        for (const order of response) {
          if (!this.orderStatusDrafts[order.orderId]) {
            this.orderStatusDrafts[order.orderId] = order.status;
          }
        }
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

  updateOrderStatus(order: AdminOrderResponse) {
    const status = this.orderStatusDrafts[order.orderId] ?? order.status;
    if (status === order.status) {
      this.toastService.success('Status is unchanged.');
      return;
    }

    this.updatingOrderId = order.orderId;
    this.menuService.updateOrderStatus(order.orderId, { status }).subscribe({
      next: (updatedOrder) => {
        this.updatingOrderId = null;
        this.orders = this.orders.map((x) => (x.orderId === updatedOrder.orderId ? updatedOrder : x));
        this.orderStatusDrafts[updatedOrder.orderId] = updatedOrder.status;
        this.toastService.success('Order status updated.');
      },
      error: () => {
        this.updatingOrderId = null;
        this.toastService.error('Unable to update order status.');
      },
    });
  }
}
