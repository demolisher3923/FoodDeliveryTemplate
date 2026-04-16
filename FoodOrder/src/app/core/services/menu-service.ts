import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { AdminOrderResponse, MenuItem, MenuItemRequest, OrderResponse, PlaceOrderRequest, UpdateOrderStatusRequest } from '../../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);

  getMenu() {
    return this.http.get<MenuItem[]>(`${environment.apiUrl}/Menu`);
  }

  createMenuItem(request: MenuItemRequest) {
    return this.http.post<MenuItem>(`${environment.apiUrl}/Menu`, request);
  }

  updateMenuItem(id: string, request: MenuItemRequest) {
    return this.http.put<MenuItem>(`${environment.apiUrl}/Menu/${id}`, request);
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

  updateOrderStatus(orderId: string, request: UpdateOrderStatusRequest) {
    return this.http.put<AdminOrderResponse>(`${environment.apiUrl}/Menu/admin-orders/${orderId}/status`, request);
  }
}
