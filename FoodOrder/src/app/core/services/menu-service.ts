import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import {
  AdminOrderResponse,
  CartItem,
  MenuItem,
  MenuItemRequest,
  OrderResponse,
  PlaceOrderRequest,
  UpdateOrderStatusRequest,
  UpsertCartItemRequest,
} from '../../models/menu.model';
import { PaginationRequest, PaginationResponse } from '../../models/pagination.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);

  getMenu() {
    return this.http.get<MenuItem[]>(`${environment.apiUrl}/Menu`);
  }

  createMenuItem(request: MenuItemRequest) {
    return this.http.post<MenuItem>(`${environment.apiUrl}/Menu`, this.toFormData(request));
  }

  updateMenuItem(id: string, request: MenuItemRequest) {
    return this.http.put<MenuItem>(`${environment.apiUrl}/Menu/${id}`, this.toFormData(request));
  }

  deleteMenuItem(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/Menu/${id}`);
  }

  placeOrder(menuItemId: string, request: PlaceOrderRequest) {
    return this.http.post<OrderResponse>(`${environment.apiUrl}/Menu/${menuItemId}/order`, request);
  }

  getMyOrders() {
    return this.http.get<OrderResponse[]>(`${environment.apiUrl}/Menu/my-orders`);
  }

  getAdminOrders() {
    return this.http.get<AdminOrderResponse[]>(`${environment.apiUrl}/Menu/admin-orders`);
  }

  getPagedAdminOrders(request: PaginationRequest) {
    return this.http.get<PaginationResponse<AdminOrderResponse>>(`${environment.apiUrl}/Menu/admin-orders`, {
      params: {
        paged: true,
        pageNumber: request.pageNumber,
        pageSize: request.pageSize,
        search: request.search ?? '',
        sortBy: request.sortBy ?? '',
        sortDirection: request.sortDirection ?? 'desc',
      },
    });
  }

  getMyCart() {
    return this.http.get<CartItem[]>(`${environment.apiUrl}/Cart`);
  }

  upsertCartItem(menuItemId: string, request: UpsertCartItemRequest) {
    return this.http.put<CartItem[]>(`${environment.apiUrl}/Cart/items/${menuItemId}`, request);
  }

  removeCartItem(menuItemId: string) {
    return this.http.delete<CartItem[]>(`${environment.apiUrl}/Cart/items/${menuItemId}`);
  }

  updateOrderStatus(orderId: string, request: UpdateOrderStatusRequest) {
    return this.http.put<AdminOrderResponse>(`${environment.apiUrl}/Menu/admin-orders/${orderId}/status`, request);
  }

  private toFormData(request: MenuItemRequest): FormData {
    const formData = new FormData();
    formData.append('name', request.name);
    formData.append('description', request.description);
    formData.append('category', request.category);
    formData.append('price', request.price.toString());
    formData.append('stockQuantity', request.stockQuantity.toString());
    formData.append('isAvailable', request.isAvailable.toString());

    if (request.imageUrl) {
      formData.append('imageUrl', request.imageUrl);
    }

    if (request.imageFile) {
      formData.append('imageFile', request.imageFile);
    }

    return formData;
  }
}
