import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
import { environment } from '../../../../../../environments/environment.development';
import Swal from 'sweetalert2';

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
  private static readonly MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);

  @ViewChild('menuImageInput') menuImageInput?: ElementRef<HTMLInputElement>;

  loadingMenu = false;
  savingMenuItem = false;
  editingMenuItemId: string | null = null;
  editingImageUrl: string | null = null;
  menuItems: MenuItem[] = [];
  readonly menuCategories = ['Fast Food', 'Pizza', 'Beverages', 'Dessert', 'Healthy'];
  selectedImageFile: File | null = null;
  selectedImageName = '';
  imagePreviewUrl: string | null = null;
  private selectedImageObjectUrl: string | null = null;

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
      imageFile: this.selectedImageFile,
    };

    if (this.editingMenuItemId && !this.selectedImageFile && this.editingImageUrl) {
      request.imageUrl = this.editingImageUrl;
    }

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
    this.editingImageUrl = item.imageUrl ?? null;
    this.selectedImageFile = null;
    this.selectedImageName = '';
    this.setImagePreview(this.resolveImageUrl(item.imageUrl));
    this.clearImageInput();

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
    this.editingImageUrl = null;
    this.selectedImageFile = null;
    this.selectedImageName = '';
    this.setImagePreview(null);
    this.clearImageInput();

    this.menuItemForm.reset({
      name: '',
      description: '',
      category: '',
      price: 0,
      stockQuantity: 0,
      isAvailable: true,
    });
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.selectedImageFile = null;
      this.selectedImageName = '';
      this.setImagePreview(this.resolveImageUrl(this.editingImageUrl));
      return;
    }

    if (!AdminMenuManagement.ALLOWED_IMAGE_TYPES.has(file.type)) {
      this.toastService.error('Only .jpg, .jpeg and .png product images are allowed.');
      this.clearImageInput();
      return;
    }

    if (file.size > AdminMenuManagement.MAX_IMAGE_SIZE_IN_BYTES) {
      this.toastService.error('Product image size must be less than or equal to 5 MB.');
      this.clearImageInput();
      return;
    }

    this.selectedImageFile = file;
    this.selectedImageName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.setImagePreview(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  clearSelectedImage(): void {
    this.selectedImageFile = null;
    this.selectedImageName = '';
    this.setImagePreview(this.resolveImageUrl(this.editingImageUrl));
    this.clearImageInput();
  }

  async deleteMenuItem(item: MenuItem): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete menu item?',
      text: `This will permanently remove ${item.name} from the menu.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) {
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

  private setImagePreview(url: string | null): void {
    this.imagePreviewUrl = url;
  }

  private resolveImageUrl(imageUrl?: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    return `${environment.apiUrl.replace('/api', '')}${imageUrl}`;
  }

  private clearImageInput(): void {
    if (this.menuImageInput?.nativeElement) {
      this.menuImageInput.nativeElement.value = '';
    }
  }
}
