import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminDashboardPanel } from './components/dashboard/dashboard';
import { AdminMenuManagement } from './components/menu-management/menu-management';
import { AdminOrdersTable } from './components/orders-table/orders-table';
import { AdminUsersTable } from './components/users-table/users-table';

type AdminSection = 'dashboard' | 'menu' | 'users' | 'orders';

@Component({
  selector: 'app-admin-menu',
  imports: [
    CommonModule,
    AdminMenuManagement,
    AdminDashboardPanel,
    AdminUsersTable,
    AdminOrdersTable,
  ],
  templateUrl: './admin-menu.html',
  styleUrl: './admin-menu.css',
})
export class AdminMenu {
  activeSection: AdminSection = 'dashboard';

  setActiveSection(section: AdminSection): void {
    this.activeSection = section;
  }
}
