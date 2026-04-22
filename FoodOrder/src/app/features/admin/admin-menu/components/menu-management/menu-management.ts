import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MenuItemCard } from '../../../../menu/components/menu-item-card/menu-item-card';
import { MenuService } from '../../../../../core/services/menu-service';
import { ToastService } from '../../../../../core/services/toast-service';
import { MenuItem, MenuItemRequest } from '../../../../../models/menu.model';

@Component({
  selector: 'app-admin-menu-management',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MenuItemCard,
  ],
  templateUrl: './menu-management.html',
  styleUrl: './menu-management.css',
})
export class AdminMenuManagement implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  loadingMenu = false;
  savingMenuItem = false;
  editingMenuItemId: string | null = null;
  menuItems: MenuItem[] = [];
  readonly menuCategories = ['Fast Food', 'Pizza', 'Beverages', 'Dessert', 'Healthy'];

  readonly menuItemForm = this.fb.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    category: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(1)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    isAvailable: [true],
  });

  ngOnInit(): void {
    this.loadMenuItems();
  }

  loadMenuItems(): void {
    this.loadingMenu = true;
    this.menuService.getMenu().subscribe({
      next: (items) => {
        this.loadingMenu = false;
        this.menuItems = items;
      },
      error: () => {
        this.loadingMenu = false;
        this.toastService.error('Unable to load menu items.');
      },
    });
  }

  saveMenuItem(): void {
    if (this.menuItemForm.invalid || this.savingMenuItem) {
      this.menuItemForm.markAllAsTouched();
      return;
    }

    this.savingMenuItem = true;
    const value = this.menuItemForm.getRawValue();
    const request: MenuItemRequest = {
      name: value.name ?? '',
      description: value.description ?? '',
      category: value.category ?? '',
      price: Number(value.price ?? 0),
      stockQuantity: Number(value.stockQuantity ?? 0),
      isAvailable: !!value.isAvailable,
    };

    const call = this.editingMenuItemId
      ? this.menuService.updateMenuItem(this.editingMenuItemId, request)
      : this.menuService.createMenuItem(request);

    call.subscribe({
      next: () => {
        this.savingMenuItem = false;
        this.toastService.success(this.editingMenuItemId ? 'Menu item updated.' : 'Menu item created.');
        this.resetMenuForm();
        this.loadMenuItems();
      },
      error: () => {
        this.savingMenuItem = false;
        this.toastService.error('Unable to save menu item.');
      },
    });
  }

  startEditMenuItem(item: MenuItem): void {
    this.editingMenuItemId = item.id;
    this.menuItemForm.patchValue({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      stockQuantity: item.stockQuantity,
      isAvailable: item.isAvailable,
    });
  }

  resetMenuForm(): void {
    this.editingMenuItemId = null;
    this.menuItemForm.reset({
      name: '',
      description: '',
      category: '',
      price: 0,
      stockQuantity: 0,
      isAvailable: true,
    });
  }

  deleteMenuItem(item: MenuItem): void {
    if (!window.confirm(`Delete ${item.name} from menu?`)) {
      return;
    }

    this.menuService.deleteMenuItem(item.id).subscribe({
      next: () => {
        this.toastService.success('Menu item deleted.');
        this.loadMenuItems();
      },
      error: () => {
        this.toastService.error('Unable to delete menu item.');
      },
    });
  }
}
