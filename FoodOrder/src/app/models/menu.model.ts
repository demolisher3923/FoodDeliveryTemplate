export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string | null;
}

export interface MenuItemRequest {
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
}

export interface PlaceOrderRequest {
  quantity: number;
}

export interface OrderResponse {
  orderId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface AdminOrderResponse {
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}

export interface UpdateOrderStatusRequest {
  status: string;
}
