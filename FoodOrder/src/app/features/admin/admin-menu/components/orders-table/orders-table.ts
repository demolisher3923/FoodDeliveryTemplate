import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminOrderResponse } from '../../../../../models/menu.model';

@Component({
  selector: 'app-admin-orders-table',
  imports: [CommonModule, MatCardModule, MatButtonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './orders-table.html',
  styleUrl: './orders-table.css',
})
export class AdminOrdersTable {
  @Input() loadingOrders = false;
  @Input({ required: true }) orderSearchForm!: FormGroup;
  @Input() pagedOrders: AdminOrderResponse[] = [];
  @Input() ordersCount = 0;
  @Input() ordersPageNumber = 1;
  @Input() ordersPageSize = 8;
  @Input() ordersTotalPages = 0;
  @Input() pageSizeOptions: number[] = [];
  @Input() orderPageNumbers: number[] = [1];
  @Input() ordersSortBy = 'createdAt';
  @Input() ordersSortDirection: 'asc' | 'desc' = 'desc';
  @Input() orderStatusOptions: string[] = [];
  @Input() orderStatusDrafts: Record<string, string> = {};
  @Input() updatingOrderId: string | null = null;

  @Output() refreshOrders = new EventEmitter<void>();
  @Output() searchApplied = new EventEmitter<void>();
  @Output() searchCleared = new EventEmitter<void>();
  @Output() sortChanged = new EventEmitter<string>();
  @Output() orderPageSizeChanged = new EventEmitter<string>();
  @Output() ordersPageChanged = new EventEmitter<number>();
  @Output() statusDraftChanged = new EventEmitter<{ orderId: string; status: string }>();
  @Output() statusSaved = new EventEmitter<AdminOrderResponse>();

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
}
