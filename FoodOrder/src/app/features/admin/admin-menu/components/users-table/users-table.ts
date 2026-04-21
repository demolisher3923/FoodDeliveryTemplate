import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminUserListItem } from '../../../../../models/user.model';

@Component({
  selector: 'app-admin-users-table',
  imports: [CommonModule, MatCardModule, MatButtonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './users-table.html',
  styleUrl: './users-table.css',
})
export class AdminUsersTable {
  @Input({ required: true }) searchForm!: FormGroup;
  @Input() loadingUsers = false;
  @Input() users: AdminUserListItem[] = [];
  @Input() pageNumber = 1;
  @Input() pageSize = 8;
  @Input() pageSizeOptions: number[] = [];
  @Input() totalPages = 0;
  @Input() totalCount = 0;
  @Input() pageNumbers: number[] = [1];

  @Output() searchApplied = new EventEmitter<void>();
  @Output() searchCleared = new EventEmitter<void>();
  @Output() sortChanged = new EventEmitter<string>();
  @Output() pageChanged = new EventEmitter<number>();
  @Output() pageSizeChanged = new EventEmitter<string>();
}
