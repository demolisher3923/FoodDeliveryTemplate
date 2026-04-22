import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '../../../../../core/services/toast-service';
import { UserService } from '../../../../../core/services/user-service';
import { AdminUserListItem } from '../../../../../models/user.model';

@Component({
  selector: 'app-admin-users-table',
  imports: [CommonModule, MatCardModule, MatButtonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './users-table.html',
  styleUrl: './users-table.css',
})
export class AdminUsersTable implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  loadingUsers = false;
  users: AdminUserListItem[] = [];
  pageNumber = 1;
  pageSize = 8;
  readonly pageSizeOptions = [5, 8, 10, 20];
  totalPages = 0;
  totalCount = 0;
  sortBy = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  readonly searchForm = this.fb.group({
    search: [''],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
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
          this.handleLoadUsersError(error);
        },
      });
  }

  applySearch(): void {
    this.pageNumber = 1;
    this.loadUsers();
  }

  clearSearch(): void {
    this.searchForm.patchValue({ search: '' });
    this.pageNumber = 1;
    this.loadUsers();
  }

  changeSort(column: string): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }

    this.pageNumber = 1;
    this.loadUsers();
  }

  goToPage(page: number): void {
    const nextPage = this.resolveNextPage(page, this.pageNumber, this.totalPages);
    if (nextPage === null) {
      return;
    }

    this.pageNumber = nextPage;
    this.loadUsers();
  }

  onPageSizeChange(size: string): void {
    const parsed = this.parsePageSize(size);
    if (parsed === null) {
      return;
    }

    this.pageSize = parsed;
    this.pageNumber = 1;
    this.loadUsers();
  }

  get pageNumbers(): number[] {
    return this.buildPageNumbers(this.pageNumber, this.totalPages);
  }

  private handleLoadUsersError(error: HttpErrorResponse): void {
    if (error.status === 0) {
      this.toastService.error('API server is not reachable. Start backend on https://localhost:7046.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.toastService.error('You are not authorized to load users list. Login as admin.');
      return;
    }

    this.toastService.error('Unable to load users list.');
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
